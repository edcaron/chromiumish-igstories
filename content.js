"use strict";

var API_BASE = "https://i.instagram.com/api/v1/";
var FEED_API = API_BASE + "feed/";
var INSTAGRAM_FEED_CLASS_NAME = "_qj7yb";

chrome.runtime.sendMessage('wait_for_ig_cookies');

function get_stories(user_id) { return new Promise(function(resolve, reject) {
	var xhr = new XMLHttpRequest();
	if (user_id) {
		xhr.open("GET", FEED_API + "user/" + user_id + "/reel_media/", true);
	} else {
		xhr.open("GET", FEED_API + "reels_tray/", true);
	}
	xhr.withCredentials = true;
	xhr.onreadystatechange = function() {
		if (xhr.readyState == 4) {
			if (xhr.status == 200) {
				resolve(JSON.parse(xhr.responseText));
			} else {
				console.log("ERROR " + JSON.stringify(xhr.statusText));
			}
		} 
	}
	xhr.send();
});}

function ctime(val) {
	const tzoff = (new Date()).getTimezoneOffset() * 60;
	const date = (new Date((val - tzoff) * 1000)).toISOString();
	return [date.substring(0, 10), date.substring(11, 16)];
}

function reset_story_root(anchor) {
	var root = document.getElementById('story_root');
	if (root) {
		while (root.firstChild) {
			root.removeChild(root.firstChild);
		}
		root.setAttribute('class', '');
	} else {
		root = document.createElement("div");
		root.setAttribute('id', 'story_root');
		anchor.appendChild(root);
	}
	return root;
}

function show_user_stories(stories_json, anchor) {
	var user = stories_json[0]['user'];
	var root = reset_story_root(anchor);

//	console.log(JSON.stringify(stories_json));

	if (root.classList.contains(user['username'] + "_stories")) {
		return;
	}
	root.setAttribute('class', user['username'] + "_stories");

	stories_json.map((story_json, i) => {
		var media_item;
		const date = ctime(story_json['taken_at']);

		var wrapper = document.createElement('div');
		wrapper.setAttribute('class', 'story_wrapper');

		var story_info = document.createElement('span');
		story_info.setAttribute('class', 'story_info');
		story_info.innerHTML = user['username'] + " - " + date[0] + ' ' + date[1];
		wrapper.appendChild(story_info);

		if (story_json['caption']) {
			var story_title = document.createElement('span');
			story_title.setAttribute('class', 'story_info');
			story_title.innerHTML = story_json['caption']['text'];
			wrapper.appendChild(story_title);
		}

		if (story_json['video_versions']) {
			media_item = document.createElement('video');
			media_item.setAttribute('controls', true);
			media_item.className = 'story_vid';

			var source = document.createElement('source');
			source.src = story_json['video_versions'][0]['url'].replace("http://", "https://")
			source.type = 'video/mp4';
			media_item.appendChild(source);
		} else {
			media_item = document.createElement('img');
			media_item.className = 'story_img';
			media_item.src = story_json['image_versions2']['candidates'][0]['url'].replace("http://", "https://")
		}
		media_item.classList.add('story_item');

		wrapper.appendChild(media_item);

		root.insertBefore(wrapper, root.childNodes[0]);
	});

	var story_foot = document.createElement('span');
	story_foot.setAttribute('class', 'story_foot');
	story_foot.innerHTML = 'EOS [' + user['username'] + ']';
	story_foot.addEventListener("click", function() {
		reset_story_root(anchor);
		window.scrollTo(0, 0);
	});
	root.appendChild(story_foot);
}


function mk_tray(stories_json, anchor) {
	if (document.getElementById("story_tray")) {
		return;
	}
	var story_tray = document.createElement("div");
	story_tray.setAttribute("id", "story_tray");
	anchor.appendChild(story_tray);
	
//	console.log(JSON.stringify(stories_json));

	var tray = stories_json["tray"];
	tray.sort(function(a, b) { return b.latest_reel_media - a.latest_reel_media });
	
	for (var i = 0; i < tray.length; i++) {(function(item) {
		var user = item['user'];
		
		var tray_icon = document.createElement('img');
		tray_icon.setAttribute("class", ((item.items) ? "unseen_story" : "seen_story") + " tray_icon");
		tray_icon.src = user['profile_pic_url'].replace("http://", "https://");
		tray_icon.title = user.username;
		
		tray_icon.addEventListener("click", function() {
			if (item.items) {
				show_user_stories(item.items, anchor);
			} else {
				get_stories(item.id).then(function(story) {
					show_user_stories(story.items, anchor);
				});
			}
		});

		var tray_name = document.createElement('span');
		tray_name.className = "tray_info tray_name";

		if (user.username.length > 11) {
			tray_name.textContent = user.username.substr(0, 10) + '…';
		} else { 
			tray_name.textContent = user.username;
		}

		var tray_time = document.createElement('span');
		tray_time.textContent = ctime(item['latest_reel_media'])[1];
		tray_time.className = "tray_info tray_time";

		
		var tray_item = document.createElement('div');
		tray_item.className = "tray_item";
		tray_item.appendChild(tray_icon);
		tray_item.appendChild(tray_name);
		tray_item.appendChild(tray_time);
		story_tray.appendChild(tray_item);
		
	})(tray[i]);}
	
}

function mk_anchor() {
	var feed = document.getElementsByClassName(INSTAGRAM_FEED_CLASS_NAME)[0];
	if (feed && !document.getElementById("igs-anchor")) {
		const anchor = document.createElement('div')
		anchor.id = 'igs-anchor'
		feed.insertBefore(anchor, feed.childNodes[0]);
		return anchor;
	} else {
		return null;
	}
}

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
	if (request != "ig_cookies_done") {
		return;
	}
	const anchor = mk_anchor();

	if (!anchor) {
		return;
	}

	get_stories().then(function(stories_json) {
		mk_tray(stories_json, anchor);
	});

});
