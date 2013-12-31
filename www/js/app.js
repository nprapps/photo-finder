var LAT = 32.35;
var LNG = -95.3;

var DISTANCE = 50000; // 50km
var DAYS_TO_GO_BACK = 5;

function updateInstagrams(since, lat, lng) {
    var now = Math.round((new Date()).getTime() / 1000);

    $.ajax({
        url: 'https://api.instagram.com/v1/media/search',
        data: {
            lat: lat,
            lng: lng,
            distance: DISTANCE,
            client_id: INSTAGRAM_CLIENT_ID,
            min_timestamp: since,
            max_timestamp: now 
        },
        dataType: 'jsonp',
        success: function(data) {
            // TODO: process pagination?
            console.log(data);
            renderInstagrams(data['data']);
        }
    });
}

function renderInstagrams(instagrams) {
    var html = '';

    for (var i = 0; i < instagrams.length; i++) {
        html += JST.instagram(instagrams[i]);
    }
        
    $('#content').html(html);
}

$(function() {
    console.log(INSTAGRAM_CLIENT_ID);

    var time_to_go_back = 60 * 60 * 24 * DAYS_TO_GO_BACK;
    var since = Math.round((new Date()).getTime() / 1000) - time_to_go_back;

    updateInstagrams(since, LAT, LNG);
});
