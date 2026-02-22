-- Debug: Check what's in membership_benefit_books for product 14509

SELECT
    id,
    product_name,
    woocommerce_product_id,
    download_url,
    is_active,
    updated_at
FROM public.membership_benefit_books
WHERE woocommerce_product_id = 14509
ORDER BY updated_at DESC;

-- Also check if it's in book_products
SELECT
    id,
    product_name,
    woocommerce_product_id,
    'book_products' as source
FROM public.book_products
WHERE woocommerce_product_id = 14509;

-- And check the granted book
SELECT
    id,
    product_name,
    product_id,
    download_url,
    granted_at
FROM public.admin_granted_books
WHERE product_id = 14509
  AND revoked_at IS NULL;
