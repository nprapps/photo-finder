var $search_form;
var $lat;
var $lng;
var $distance;
var $hours_back;
var $photos;

var DAYS_TO_GO_BACK = 5;

function updateInstagrams(lat, lng, distance, since) {
    var now = Math.round((new Date()).getTime() / 1000);

    $.ajax({
        url: 'https://api.instagram.com/v1/media/search',
        data: {
            lat: lat,
            lng: lng,
            distance: distance,
            client_id: INSTAGRAM_CLIENT_ID,
            min_timestamp: since,
            max_timestamp: now 
        },
        dataType: 'jsonp',
        success: function(data) {
            // TODO: process pagination?
            console.log(data['meta']);
            renderInstagrams(data['data']);
        }
    });
}

function renderInstagrams(instagrams) {
    var html = '';

    for (var i = 0; i < instagrams.length; i++) {
        var instagram = instagrams[i];

        console.log(instagram);
        html += JST.instagram(instagram);
    }
        
    $photos.html(html);
}

function on_search_form_submit(e) {
    var lat = parseFloat($lat.val());
    var lng = parseFloat($lng.val());
    var distance = parseFloat($distance.val()) * 1000;
    var hours_back = parseFloat($hours_back.val());

    if (hours_back > 168) {
        alert('Can\'t search photos from more than 7 days (168 hours) back.');
        return false;
    }

    var time_to_go_back = 60 * 60 * hours_back;
    var since = Math.round((new Date()).getTime() / 1000) - time_to_go_back;

    $photos.empty();
    updateInstagrams(lat, lng, distance, since);

    return false;
}

$(function() {
    $search_form = $('#search');
    $lat = $('#lat');
    $lng = $('#lng');
    $distance = $('#distance');
    $hours_back = $('#hours-back');
    $photos = $('#photos');

    $search_form.on('submit', on_search_form_submit);  
});
