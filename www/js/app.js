var $geocoding_form;
var $location;
var $geocoding_loading;
var $geocoding_did_you_mean;
var $geocoding_not_found;
var $geo_search_form;
var $distance;
var $hours_back;
var $tag_search_form;
var $tag;
var $photos;
var $load_more;
var $center_target;

var $nav;
var $search;
var $search_map;
var $search_address;
var $search_hashtag;
var $search_results;

var clipper = null;
var distance = 50;
var hours_back = 48;
var lat = null;
var lng = null;
var search_xhr = null;
var more_tag_search_url = null;

var map;
var zoom_level;

function trim(s) {
    return s.replace(/^\s+|\s+$/g, '');
}

function tag_search(tag) {
    if (search_xhr) {
        search_xhr.abort();
    }

    search_xhr = $.ajax({
        url: 'https://api.instagram.com/v1/tags/' + tag + '/media/recent',
        data: {
            client_id: INSTAGRAM_CLIENT_ID
        },
        dataType: 'jsonp',
        successData: {
            tag: tag
        },
        success: function(data) {
            more_tag_search_url = data['pagination']['next_url'];

            var $section = $(JST.instagram_section({
                title: 'Photos tagged "' + this.successData.tag + '"'
            }));

            $photos.append($section);
            render($section, data['data']);
        }
    });
}

function on_more_tag_search_clicked() {
    if (search_xhr) {
        search_xhr.abort();
    }

    search_xhr = $.ajax({
        url: more_tag_search_url,
        dataType: 'jsonp',
        success: function(data) {
            more_tag_search_url = data['pagination']['next_url'];

            var $section = $photos.find('.section').last();

            render($section, data['data']);
        }
    });

    return false;
}

function geo_search(lat, lng, distance, since) {
    console.log(lat, lng, distance);

    var now = Math.round((new Date()).getTime() / 1000);

    if (search_xhr) {
        search_xhr.abort();
    }

    search_xhr = $.ajax({
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
        complete: function() {
            search_xhr = null;
        },
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
        photo['timestamp'] = moment.unix(photo['created_time']).format('MMM Do h:mm a');

        html += JST.instagram(photo);
    }

    $section.find('.photo-list').append(html);

    clipper.glue($('.clipper'));
}

function on_geocoding_form_submit(e) {
    var location = $location.val();

    if (location === '') {
        return false;
    }

    if (search_xhr) {
        search_xhr.abort();
    }

    $geocoding_not_found.hide();
    $geocoding_did_you_mean.hide();
    $geocoding_loading.show();

    search_xhr = $.ajax({
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
            search_xhr = null;
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
                lat = locale['lat'];
                lng = locale['lon'];

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

    $geocoding_did_you_mean.hide();

    lat = $this.data('latitude');
    lng = $this.data('longitude');

    on_geo_search_form_submit();

    return false;
}

function on_geo_search_form_submit(e) {
    distance = parseFloat($distance.val()) * 1000;
    hours_back = parseFloat($hours_back.val());

    if (hours_back > 168) {
        alert('Can\'t search photos from more than 7 days (168 hours) back.');
        return false;
    }

    var time_to_go_back = 60 * 60 * hours_back;
    var since = Math.round((new Date()).getTime() / 1000) - time_to_go_back;

    hasher.setHash('geo-search/' + [lat, lng, distance, since].join(','));

    return false;
}

function on_tag_search_form_submit(e) {
    var tag = $tag.val();

    if (tag === '') {
        return false;
    }

    hasher.setHash('tag-search/' + tag);

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
            reset_map();
            break;
    }

    $nav.find('li.' + tab).addClass('active').siblings('li').removeClass('active');
    $search_results.hide();

}

function on_hash_changed(new_hash, old_hash) {
    if (new_hash === '') {
        hasher.setHash('tag-search/nprlife');

        return;
    }

    var bits = new_hash.split('/');
    var hash_type = bits[0];
    var args = bits[1].split(',');

    if (hash_type == 'geo-search') {
        $nav.find('li.address').click();

        $search_results.show();
        $load_more.hide();
        $geo_search_form.show();
        $photos.empty();

        geo_search.apply(this, args);
    } else if (hash_type == 'tag-search') {
        $nav.find('li.hashtag').click();

        $tag.val(args[0]);

        $search_results.show();
        $load_more.show();
        $geo_search_form.hide();
        $photos.empty();

        tag_search.apply(this, args);
    } else if (hash_type == 'map-search') {
        $nav.find('li.map').click();

        map.setView([args[0], args[1]], zoom_level);

        $search_results.show();
        $load_more.hide();
        $geo_search_form.hide();
        $photos.empty();

        geo_search.apply(this, args);
    }
}

var process_map_location = function() {
    /*
    * Runs when the map location is upddated.
    * Sets the hash with the current latlng;
    */

    // Handle the map's current location.
    var latlng = map.getCenter();
    var lat = latlng.lat;
    var lng = latlng.lng;

    zoom_level = map.getZoom();

    // Use the global distance and hours back.
    distance = parseFloat($distance.val()) * 1000;
    hours_back = parseFloat($hours_back.val());

    if (hours_back > 168) {
        alert('Can\'t search photos from more than 7 days (168 hours) back.');
        return false;
    }

    var time_to_go_back = 60 * 60 * hours_back;
    var since = Math.round((new Date()).getTime() / 1000) - time_to_go_back;

    // Set the hash, which is what triggers some redrawing.
    hasher.setHash('map-search/' + [lat, lng, distance, since].join(','));

};

var reset_map = function() {
    /*
    * Resets/redraws the map after movement and such.
    */

    // Set the transparent marker in the center of the map.
    var target_top = $('#map').height() / 2;
    var target_left = $('#map').width() / 2;
    $center_target.css('top', target_top - 15 + 'px');
    $center_target.css('left', target_left - 15 + 'px');

    // Repaint.
    map.invalidateSize(false);

    // Handle the map's location.
    process_map_location();
};

var init_map = function() {
    /*
    * Initializes map. Centers on Chicago, IL.
    */
    map = L.map('map').setView([39.8282, -98.5795], zoom_level);
    L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png').addTo(map);
};

$(function() {
    $geocoding_form = $('#geocoding');
    $geocoding_loading = $geocoding_form.find('.loading');
    $geocoding_did_you_mean = $geocoding_form.find('.did-you-mean');
    $geocoding_not_found = $geocoding_form.find('.not-found');
    $location = $('#location');
    $geo_search_form = $('#geo-search');
    $distance = $('#distance');
    $hours_back = $('#hours-back');
    $tag_search_form = $('#tag-search');
    $tag = $('#tag');
    $photos = $('#photos');
    $load_more = $('#load-more');

    $nav = $('#search-nav');
    $search = $('#search');
    $search_map = $('#search-map');
    $search_address = $('#search-address');
    $search_hashtag = $('#search-hashtag');
    $search_results = $('#search-results');

    $center_target = $('#map-marker');

    zoom_level = 7;

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
    $load_more.on('click', on_more_tag_search_clicked);

    $nav.find('li').on('click', on_nav_click);

    init_map();
    map.on('moveend', process_map_location);

    hasher.changed.add(on_hash_changed);
    hasher.initialized.add(on_hash_changed);
    hasher.init();
});
