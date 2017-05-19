"use strict";
var ig_cookies = {};
var DOMAIN_URL = "https://www.instagram.com";

chrome.runtime.onMessage.addListener(function(request, sender, dummy) {
	if (request != "wait_for_ig_cookies") {
		return;
	}

	chrome.cookies.getAll({ url: DOMAIN_URL }, function(cookie_list) {
		if (!cookie_list) {
			return;
		}
		for (var i = 0; i < cookie_list.length; i++) {
			switch (cookie_list[i].name) {
			case 'ds_user_id':
				ig_cookies.ds_user_id = cookie_list[i].value;
				break;
			case 'sessionid':
				ig_cookies.sessionid = cookie_list[i].value;
				break;
			}
		}
		if (ig_cookies.ds_user_id && ig_cookies.sessionid) {
			chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
				chrome.tabs.sendMessage(tabs[0].id, "ig_cookies_done");
			});
		}
	});
});

chrome.webRequest.onBeforeSendHeaders.addListener(
	function(info) {
		var headers = info.requestHeaders;
		var do_inject = true;
		
		headers.push({ name : "x-ig-capabilities", value : "3w==" });

		for (var i = 0; i < headers.length; i++) {
			var header = headers[i];
			switch (header.name.toLowerCase()) {
			case 'x-requested-with':
				do_inject = false;
				break;
			case 'referer':
				if (header.value != "https://www.instagram.com/") {
					do_inject = false;
				}
				break;
			case 'user-agent':
				header.value = 'Instagram 10.3.2 (iPhone7,2; iPhone OS 9_3_3; en_US; en-US; scale=2.00; 750x1334) AppleWebKit/420+';
				break;
			case 'cookie':
				if (ig_cookies.ds_user_id && ig_cookies.sessionid) {
					header.value += "ds_user_id=" + ig_cookies.ds_user_id + ";";
					header.value += "sessionid=" + ig_cookies.sessionid + ";";
				} else {
					do_inject = false;
				}
				break;
			}
		}

		if (do_inject) {
			return { requestHeaders : headers };
		} else {
			return { requestHeaders : info.requestHeaders };
		}
	},
	{
		urls: [
			"*://*.instagram.com/*"
		],
		types: ["xmlhttprequest"]
	},
	["blocking", "requestHeaders"]
);
