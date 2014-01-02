var $geocoding_form;
var $location;
var $geocoding_loading;
var $geocoding_did_you_mean;
var $geocoding_not_found;
var $geo_search_form;
var $lat;
var $lng;
var $distance;
var $hours_back;
var $tag_search_form;
var $tags;
var $photos;

var $nav;
var $search;
var $search_map;
var $search_address;
var $search_hashtag;
var $search_results;

var clipper = null;
var geocode_xhr = null;

function tag_search(tags) {
    $.ajax({
        url: 'https://api.instagram.com/v1/tags/' + tags + '/media/recent',
        data: {
            client_id: INSTAGRAM_CLIENT_ID
        },
        dataType: 'jsonp',
        success: function(data) {
            var $section = $(JST.instagram_section({ title: 'Photos tagged "' + tags + '"' }));
            $photos.append($section);
            render($section, data['data']);
        }
    });
}

function geo_search(lat, lng, distance, since) {
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
            var $section = $(JST.instagram_section({ title: 'Photos near ' + lat + ', ' + lng }));
            $photos.append($section);
            render($section, data['data']);
        }
    });
}

function render($section, photos) {
    var html = '';

    for (var i = 0; i < photos.length; i++) {
        var photo = photos[i];
        photo['timestamp'] = moment.unix(photo['created_time']).format('MMM Do h:mm a')

        html += JST.instagram(photo);
    }
        
    $section.find('ul').append(html);

    clipper.glue($('.clipper'));
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

    $geocoding_not_found.hide();
    $geocoding_did_you_mean.hide();
    $geocoding_loading.show();

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
            $geocoding_loading.hide();
        },
        'success': function(data) {
            if (data.length === 0) {
                // No results
                $geocoding_not_found.show();
            } else if (data.length == 1) {
                // One result
                var locale = data[0];

                var display_name = locale['display_name'].replace(', United States of America', '');
                var lat = locale['lat'];
                var lng = locale['lon'];

                $lat.val(lat);
                $lng.val(lng);
                
                // auto-submit the lat/lon
                on_geo_search_form_submit();
            } else {
                // Many results
                $geocoding_did_you_mean.empty();

                _.each(data, function(locale) {
                    locale['display_name'] = locale['display_name'].replace(', United States of America', '');
                    var context = $.extend(APP_CONFIG, locale);
                    var html = JST.geocoding_did_you_mean(context);

                    $geocoding_did_you_mean.append(html);
                });
                    
                $geocoding_did_you_mean.show();
            }
        }
    });

    return false;
}

function on_geocoding_did_you_mean_click() {
    var $this = $(this);
    var display_name = $this.data('display-name');
    var latitude = $this.data('latitude');
    var longitude = $this.data('longitude');

    $geocoding_did_you_mean.hide();

    $lat.val(latitude);
    $lng.val(longitude);

    return false;
}

function on_geo_search_form_submit(e) {
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

    $search.hide();
    $search_results.show();
    $photos.empty();
    geo_search(lat, lng, distance, since);

    return false;
}

function on_tag_search_form_submit(e) {
    var tags = $tags.val();

    $photos.empty();
    tag_search(tags);

    return false;
}

function on_nav_click(e) {
    var tab = e.target.className;
    
    switch(tab) {
        case 'address':
            $search_address.show();
            $search_hashtag.hide();
            $search_map.hide();
            break;
        case 'hashtag':
            $search_address.hide();
            $search_hashtag.show();
            $search_map.hide();
            break;
        case 'map':
            $search_address.hide();
            $search_hashtag.hide();
            $search_map.show();
            break;
    }

    $nav.find('li.' + tab).addClass('active').siblings('li').removeClass('active');
    $search_results.hide();
}

$(function() {
    $geocoding_form = $('#geocoding');
    $geocoding_loading = $geocoding_form.find('.loading');
    $geocoding_did_you_mean = $geocoding_form.find('.did-you-mean');
    $geocoding_not_found = $geocoding_form.find('.not-found');
    $location = $('#location');
    $geo_search_form = $('#geo-search');
    $lat = $('#lat');
    $lng = $('#lng');
    $distance = $('#distance');
    $hours_back = $('#hours-back');
    $tag_search_form = $('#tag-search');
    $tags = $('#tags');
    $photos = $('#photos');
    
    $nav = $('ul.nav');
    $search = $('#search');
    $search_map = $('#search-map');
    $search_address = $('#search-address');
    $search_hashtag = $('#search-hashtag');
    $search_results = $('#search-results');

    ZeroClipboard.setDefaults({
        moviePath: "js/lib/ZeroClipboard.swf"
    });
    
    clipper = new ZeroClipboard();

    clipper.on('complete', function() {
        alert('Copied to clipboard!');
    });

    $geocoding_form.on('submit', on_geocoding_form_submit);  
    $geocoding_did_you_mean.on('click', 'li', on_geocoding_did_you_mean_click);
    $geo_search_form.on('submit', on_geo_search_form_submit);  
    $tag_search_form.on('submit', on_tag_search_form_submit);
    
    $nav.find('li').on('click', on_nav_click);
    $nav.find('li.map').trigger('click');
});
