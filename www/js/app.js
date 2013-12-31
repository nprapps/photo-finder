var $geocoding_form;
var $location;
var $search_form;
var $lat;
var $lng;
var $distance;
var $hours_back;
var $photos;

var geocode_xhr = null;

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
            renderInstagrams(data['data']);
        }
    });
}

function renderInstagrams(instagrams) {
    var html = '';

    for (var i = 0; i < instagrams.length; i++) {
        var instagram = instagrams[i];
        instagram['timestamp'] = moment.unix(instagram['created_time']).format('MMM Do h:mm a')

        html += JST.instagram(instagram);
    }
        
    $photos.html(html);
}

function on_geocoding_form_submit(e) {
    var location = $location.val();

    if (location == '') {
        return false;
    }

    $lat.val('');
    $lng.val('');

    if (geocode_xhr) {
        geocode_xhr.abort();
    }

    //$search_loading.show();

    geocode_xhr = $.ajax({
        'url': 'http://open.mapquestapi.com/nominatim/v1/search.php',
        'data': {
            'format': 'json',
            'json_callback': 'theCallback',
            'q': location,
            //'viewbox': MISSOURI_EXTENTS.join(','),
            'bounded': 1
        },
        'type': 'GET',
        'dataType': 'jsonp',
        'cache': true,
        'jsonp': false,
        'jsonpCallback': 'theCallback',
        'contentType': 'application/json',
        'complete': function() {
            geocode_xhr = null;
        },
        'success': function(data) {
            //$search_loading.hide();

            if (data.length === 0) {
                // No results
                alert('No results found.');
            } else if (data.length == 1) {
                // One result
                var locale = data[0];

                var display_name = locale['display_name'].replace(', United States of America', '');
                var lat = locale['lat'];
                var lng = locale['lon'];

                $location.val(display_name);
                $lat.val(lat);
                $lng.val(lng);
            } else {
                // Many results
                /*$did_you_mean_list.empty();

                _.each(data, function(locale) {
                    locale['display_name'] = locale['display_name'].replace(', United States of America', '');
                    var context = $.extend(APP_CONFIG, locale);
                    var html = JST.did_you_mean(context);

                    $did_you_mean_list.append(html);
                });
                    
                $did_you_mean.show();*/

               alert('Multiple results found. Be more specific.');
            }
        }
    });

    return false;
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
    $geocoding_form = $('#geocoding');
    $location = $('#location');
    $search_form = $('#search');
    $lat = $('#lat');
    $lng = $('#lng');
    $distance = $('#distance');
    $hours_back = $('#hours-back');
    $photos = $('#photos');

    $geocoding_form.on('submit', on_geocoding_form_submit);  
    $search_form.on('submit', on_search_form_submit);  
});
