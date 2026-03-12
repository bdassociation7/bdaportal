<?php
/**
 * WordPress API Endpoint: Get User Books (Filtered)
 *
 * This endpoint should be added to the BDA Portal WordPress plugin
 * Location: wp-content/plugins/bda-portal-integration/includes/api/class-user-books-endpoint.php
 *
 * Purpose: Returns only actual book products for a user, excluding:
 * - Membership products
 * - Learning system products
 * - Partnership products
 * - Other non-book items
 */

add_action('rest_api_init', function () {
    register_rest_route('bda-portal/v1/woocommerce', '/user-books', array(
        'methods' => 'GET',
        'callback' => 'bda_get_user_books',
        'permission_callback' => '__return_true',
    ));
});

function bda_get_user_books($request) {
    $customer_email = $request->get_param('customer_email');
    $status = $request->get_param('status') ?: 'completed';
    $search = $request->get_param('search');

    if (empty($customer_email)) {
        return new WP_REST_Response(array(
            'success' => false,
            'message' => 'customer_email parameter is required'
        ), 400);
    }

    try {
        // Get Supabase connection details from environment
        $supabase_url = getenv('SUPABASE_URL');
        $supabase_key = getenv('SUPABASE_SERVICE_ROLE_KEY');

        // Fetch book product IDs from Supabase
        $book_product_ids = array();
        $excluded_product_ids = array();

        if ($supabase_url && $supabase_key) {
            // Fetch book products (these are allowed)
            $book_products_response = wp_remote_get(
                $supabase_url . '/rest/v1/book_products?is_active=eq.true&select=woocommerce_product_id',
                array(
                    'headers' => array(
                        'apikey' => $supabase_key,
                        'Authorization' => 'Bearer ' . $supabase_key,
                    ),
                )
            );

            if (!is_wp_error($book_products_response)) {
                $book_products = json_decode(wp_remote_retrieve_body($book_products_response), true);
                $book_product_ids = array_column($book_products, 'woocommerce_product_id');
            }

            // Fetch non-book products (these should be excluded)
            // 1. Membership products
            $membership_response = wp_remote_get(
                $supabase_url . '/rest/v1/membership_product_mapping?is_active=eq.true&select=woocommerce_product_id',
                array(
                    'headers' => array(
                        'apikey' => $supabase_key,
                        'Authorization' => 'Bearer ' . $supabase_key,
                    ),
                )
            );

            if (!is_wp_error($membership_response)) {
                $membership_products = json_decode(wp_remote_retrieve_body($membership_response), true);
                $excluded_product_ids = array_merge($excluded_product_ids, array_column($membership_products, 'woocommerce_product_id'));
            }

            // 2. Learning system products
            $learning_response = wp_remote_get(
                $supabase_url . '/rest/v1/learning_system_products?is_active=eq.true&select=woocommerce_product_id',
                array(
                    'headers' => array(
                        'apikey' => $supabase_key,
                        'Authorization' => 'Bearer ' . $supabase_key,
                    ),
                )
            );

            if (!is_wp_error($learning_response)) {
                $learning_products = json_decode(wp_remote_retrieve_body($learning_response), true);
                $excluded_product_ids = array_merge($excluded_product_ids, array_column($learning_products, 'woocommerce_product_id'));
            }

            // 3. Partnership products
            $partnership_response = wp_remote_get(
                $supabase_url . '/rest/v1/partnership_product_mapping?is_active=eq.true&select=woocommerce_product_id',
                array(
                    'headers' => array(
                        'apikey' => $supabase_key,
                        'Authorization' => 'Bearer ' . $supabase_key,
                    ),
                )
            );

            if (!is_wp_error($partnership_response)) {
                $partnership_products = json_decode(wp_remote_retrieve_body($partnership_response), true);
                $excluded_product_ids = array_merge($excluded_product_ids, array_column($partnership_products, 'woocommerce_product_id'));
            }
        }

        // Get all completed orders for this customer
        $orders = wc_get_orders(array(
            'customer' => $customer_email,
            'status' => $status,
            'limit' => -1,
        ));

        $books = array();

        foreach ($orders as $order) {
            foreach ($order->get_items() as $item) {
                $product = $item->get_product();
                if (!$product) continue;

                $product_id = $product->get_id();

                // Skip if product is excluded (membership, learning system, partnership)
                if (in_array($product_id, $excluded_product_ids)) {
                    continue;
                }

                // If book_product_ids is configured, only include products in that list
                // If not configured (empty), include all non-excluded products
                if (!empty($book_product_ids) && !in_array($product_id, $book_product_ids)) {
                    continue;
                }

                // Apply search filter if provided
                if ($search && stripos($product->get_name(), $search) === false) {
                    continue;
                }

                // Get downloadable files
                $downloads = $product->get_downloads();
                $download_url = null;
                if (!empty($downloads)) {
                    $first_download = reset($downloads);
                    $download_url = $first_download->get_file();
                }

                // Determine format from product meta or file extension
                $format = null;
                if ($download_url) {
                    $ext = strtolower(pathinfo($download_url, PATHINFO_EXTENSION));
                    if (in_array($ext, array('pdf', 'epub', 'mobi'))) {
                        $format = $ext;
                    }
                }

                // Get product image
                $image_id = $product->get_image_id();
                $cover_image = $image_id ? wp_get_attachment_url($image_id) : null;

                $books[] = array(
                    'id' => 'order-' . $order->get_id() . '-' . $item->get_id(),
                    'product_id' => $product_id,
                    'order_id' => $order->get_id(),
                    'product_name' => $product->get_name(),
                    'sku' => $product->get_sku(),
                    'format' => $format,
                    'cover_image' => $cover_image,
                    'description' => $product->get_short_description(),
                    'pages' => $product->get_meta('_pages'), // Custom field for page count
                    'purchased_at' => $order->get_date_created()->format('Y-m-d H:i:s'),
                    'expires_at' => null, // Can be calculated based on product settings
                    'download_url' => $download_url,
                    'access_type' => 'purchase',
                );
            }
        }

        return new WP_REST_Response(array(
            'success' => true,
            'data' => $books,
            'count' => count($books)
        ), 200);

    } catch (Exception $e) {
        return new WP_REST_Response(array(
            'success' => false,
            'message' => 'Error fetching user books',
            'error' => $e->getMessage()
        ), 500);
    }
}
