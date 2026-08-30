<?php
/**
 * BDA public sitemap.
 * This file only requests public programme slugs and public SEO visibility flags.
 */
header('Content-Type: application/xml; charset=UTF-8');
header('Cache-Control: public, max-age=900');

$portalOrigin = 'https://portal.bda-global.org';
$supabaseUrl = rtrim(base64_decode('aHR0cHM6Ly9kZnNienN4dXVyc3Zxd256cnVxdC5zdXBhYmFzZS5jbwo='));
$supabaseAnonKey = trim(base64_decode('ZXlKaGJHY2lPaUpJVXpJMU5pSXNJblI1Y0NJNklrcFhWQ0o5LmV5SnBjM01pT2lKemRYQmhZbUZ6WlNJc0luSmxaaUk2SW1SbWMySjZjM2gxZFhKemRuRjNibnB5ZFhGMElpd2ljbTlzWlNJNkltRnViMjRpTENKcFlYUWlPakUzTlRnNU1EUTNNVGtzSW1WNGNDSTZNakEzTkRRNE1EY3hPWDAuN21remRKOHFUTXJTQjhkOXd2NFdkdnZaT1lXdUZDNUZqXzRIN2VLZ3F4VQo='));

function requestPublicRows($url, $anonKey) {
    $response = false;
    if (function_exists('curl_init')) {
        $request = curl_init($url);
        curl_setopt_array($request, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 8,
            CURLOPT_HTTPHEADER => [
                "apikey: {$anonKey}",
                "Authorization: Bearer {$anonKey}",
                'Accept: application/json',
            ],
        ]);
        $response = curl_exec($request);
        $status = curl_getinfo($request, CURLINFO_HTTP_CODE);
        curl_close($request);
        if ($status < 200 || $status >= 300) $response = false;
    } elseif (filter_var(ini_get('allow_url_fopen'), FILTER_VALIDATE_BOOLEAN)) {
        $context = stream_context_create([
            'http' => [
                'method' => 'GET',
                'header' => "apikey: {$anonKey}\r\nAuthorization: Bearer {$anonKey}\r\nAccept: application/json\r\n",
                'timeout' => 8,
            ],
        ]);
        $response = @file_get_contents($url, false, $context);
    }
    $decoded = is_string($response) ? json_decode($response, true) : null;
    return is_array($decoded) ? $decoded : [];
}

function xmlEscape($value) {
    return htmlspecialchars((string) $value, ENT_XML1 | ENT_QUOTES, 'UTF-8');
}

function sitemapEntry($url, $changefreq, $priority, $lastmod = null) {
    $entry = "  <url>\n    <loc>" . xmlEscape($url) . "</loc>\n";
    if ($lastmod) $entry .= "    <lastmod>" . xmlEscape($lastmod) . "</lastmod>\n";
    return $entry . "    <changefreq>{$changefreq}</changefreq>\n    <priority>{$priority}</priority>\n  </url>\n";
}

$pageRows = requestPublicRows(
    $supabaseUrl . '/rest/v1/seo_page_settings?select=page_key,route_pattern,robots_directive&robots_directive=eq.index%2C%20follow',
    $supabaseAnonKey
);

$defaultPages = [
    ['page_key' => 'public-programmes', 'route_pattern' => '/public/programs'],
    ['page_key' => 'public-providers', 'route_pattern' => '/public/providers'],
    ['page_key' => 'credential-verification', 'route_pattern' => '/verify'],
];
$indexablePages = count($pageRows) ? $pageRows : $defaultPages;

$programmeRows = requestPublicRows(
    $supabaseUrl . '/rest/v1/pdp_programs?select=id,slug,updated_at&status=eq.approved&is_active=eq.true&slug=not.is.null&order=updated_at.desc',
    $supabaseAnonKey
);
$noIndexOverrides = requestPublicRows(
    $supabaseUrl . '/rest/v1/seo_program_overrides?select=program_id&robots_directive=eq.noindex%2C%20follow',
    $supabaseAnonKey
);
$noIndexIds = array_flip(array_map(fn($row) => (string) ($row['program_id'] ?? ''), $noIndexOverrides));

echo "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n";
echo "<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n";
foreach ($indexablePages as $page) {
    $route = trim((string) ($page['route_pattern'] ?? ''));
    if ($route !== '' && strpos($route, ':') === false) echo sitemapEntry($portalOrigin . $route, 'weekly', '0.8');
}
foreach ($programmeRows as $programme) {
    $id = (string) ($programme['id'] ?? '');
    $slug = trim((string) ($programme['slug'] ?? ''));
    if ($slug === '' || isset($noIndexIds[$id])) continue;
    $lastmod = !empty($programme['updated_at']) ? gmdate('Y-m-d', strtotime($programme['updated_at'])) : null;
    echo sitemapEntry($portalOrigin . '/public/programs/' . rawurlencode($slug), 'weekly', '0.7', $lastmod);
}
echo "</urlset>\n";
