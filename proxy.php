<?php
 
/**
 *  Usage:
 *  Send the url you want to access url encoded in the url paramater, for example (This is with JS): 
 *  /twitter-proxy.php?url='+encodeURIComponent('statuses/user_timeline.json?screen_name=MikeRogers0&count=2')
*/

include('config.php');

if(!isset($config)) {
    error('config.php missing');
}

function error ($message) {
    header($_SERVER['SERVER_PROTOCOL'] . ' 500 Internal Server Error', true, 500);
    die($message);
}
/*
* Ok, no more config should really be needed. Yay!
*/
 
// We'll get the URL from $_GET[]. Make sure the url is url encoded, for example encodeURIComponent('statuses/user_timeline.json?screen_name=MikeRogers0&count=10&include_rts=false&exclude_replies=true')
if(!isset($_GET['url'])){
    die('No URL set');
}
 
$url = $_GET['url'];

 
// Figure out the URL parmaters
$url_parts = parse_url($url);
parse_str($url_parts['query'], $url_arguments);
 
$full_url = $config['base_url'].$url; // Url with the query on it.
$base_url = $config['base_url'].$url_parts['path']; // Url without the query.
 
/**
* Code below from http://stackoverflow.com/questions/12916539/simplest-php-example-retrieving-user-timeline-with-twitter-api-version-1-1 by Rivers 
* with a few modfications by Mike Rogers to support variables in the URL nicely
*/
 
function buildBaseString($baseURI, $method, $params) {
    $r = array();
    ksort($params);
    foreach($params as $key=>$value){
    $r[] = "$key=" . rawurlencode($value);
    }
    return $method."&" . rawurlencode($baseURI) . '&' . rawurlencode(implode('&', $r));
}
 
function buildAuthorizationHeader($oauth) {
    $r = 'Authorization: OAuth ';
    $values = array();
    foreach($oauth as $key=>$value)
    $values[] = "$key=\"" . rawurlencode($value) . "\"";
    $r .= implode(', ', $values);
    return $r;
}
 
// Set up the oauth Authorization array
$oauth = array(
    'oauth_consumer_key' => $config['consumer_key'],
    'oauth_nonce' => time(),
    'oauth_signature_method' => 'HMAC-SHA1',
    'oauth_token' => $config['oauth_access_token'],
    'oauth_timestamp' => time(),
    'oauth_version' => '1.0'
);
    
$base_info = buildBaseString($base_url, 'GET', array_merge($oauth, $url_arguments));
$composite_key = rawurlencode($config['consumer_secret']) . '&' . rawurlencode($config['oauth_access_token_secret']);
$oauth_signature = base64_encode(hash_hmac('sha1', $base_info, $composite_key, true));
$oauth['oauth_signature'] = $oauth_signature;
 
// Make Requests
$header = array(
    buildAuthorizationHeader($oauth), 
    'Expect:'
);
$options = array(
    CURLOPT_HTTPHEADER => $header,
    //CURLOPT_POSTFIELDS => $postfields,
    CURLOPT_HEADER => false,
    CURLOPT_URL => $full_url,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_SSL_VERIFYPEER => false
);
 
// In your config file
include("./php/phpfastcache.php");
phpFastCache::$storage = "auto";
$result = phpFastCache::get($url_arguments);

if($result == null) {
    $feed = curl_init();
    curl_setopt_array($feed, $options);
    $result = curl_exec($feed);
    $info = curl_getinfo($feed);
    curl_close($feed);

    // set products in to cache in 600 seconds = 10 minutes
    phpFastCache::set($url_arguments,$result,60);
}
 
// Send suitable headers to the end user.
if(isset($info['content_type']) && isset($info['size_download'])){
    header('Content-Type: '.$info['content_type']);
    header('Content-Length: '.$info['size_download']);
 
}
 
echo($result);
?>