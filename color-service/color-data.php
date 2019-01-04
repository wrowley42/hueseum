<?php
require_once(__DIR__.'/./colors.inc.php');

$delta = 25;
$reduce_brightness = true;
$reduce_gradients = true;
$num_results = 10;
$image_URL = './user-uploads/' . $argv[1] . ".jpg";

$ex = new GetMostCommonColors();
$colors = $ex->Get_Color($image_URL,
$num_results,
$reduce_brightness,
$reduce_gradients,
$delta);

$color_list = "";
$percentage_list= "";
$output = array();
foreach ( $colors as $hex => $percentage ) {
  error_log(print_r($variable, TRUE));
  if ( $percentage > 0 ) {
    $color_list = $color_list . "#" . $hex . ", ";
    $percentage_list = $percentage_list . $percentage . ", ";
    $c = array();
    $c["color"] = "#" . $hex;
    $c["percent"] = $percentage;
    $c["hue"] = $ex->Get_Hue($hex);
    $c["css3"] = "#" . $ex->Get_CSS3($hex);
    $c["spectrum"] = "#" . $ex->Get_Spectrum($hex);
    $output[] = $c;
  }
}
$print_value = json_encode(array("colors"=>$output), JSON_PRETTY_PRINT);
print_r($print_value);
?>
