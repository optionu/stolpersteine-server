// Copyright (C) 2013 Option-U Software
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.

"use strict";

var request = require('request'),
	jsdom = require('jsdom'),
	url = require('url'),
	util = require('util'),
	async = require('async');

var uriSources = [
	url.parse('http://de.m.wikipedia.org/wiki/Liste_der_Stolpersteine_in_Berlin-Britz'),
	url.parse('http://de.m.wikipedia.org/wiki/Liste_der_Stolpersteine_in_Berlin-Moabit')
];
//var urlApi = 'http://127.0.0.1:3000/api';
var urlApi = 'https://stolpersteine-optionu.rhcloud.com/api';
var userAgent = 'Stolpersteine/1.0 (http://option-u.com; stolpersteine@option-u.com)';

for (var i = 0; i < uriSources.length; i++) {
	var uriSource = uriSources[i];
	
	request({ uri:uriSource, headers: {'user-agent' : userAgent } }, function(error, response, body) {
	  if (error) {
	    console.log('Error when contacting site');
			return;
	  }
  
	  jsdom.env({
	    html: body,
	    scripts: ['http://code.jquery.com/jquery-1.7.min.js']
	  }, function (err, window) {
			var images = [];
		
			var source = { 
				url: uriSource.href,
				name: "Wikipedia",
				retrievedAt: new Date(response.headers.date)
			};
		
			var $ = window.jQuery;
			var tableRows = $('table.wikitable.sortable tr');
			tableRows = tableRows.slice(1, tableRows.length); // first item is table header row
			console.log('Num table rows: ' + tableRows.length);
	//		tableRows = tableRows.slice(91, 92);	// restrict test data
			async.forEachLimit(tableRows, 1, function(tableRow, callback) {
				async.waterfall([
					convertImage.bind(undefined, $, tableRow),
					patchImage,
					addSourceToImage.bind(undefined, source)
				], function(err, image) {
					if (!err) {
						if (image.imageCanonicalUrl) {
							images.push(image);
							console.log(util.inspect(image));
						}
					} else {
						console.log('Error processing image (' + err + ')');
					}
					callback(err);
				});
			}, function() {
				console.log('Done processing ' + tableRows.length + ' stolperstein(e), ' + images.length + ' image(s)');
				var importData = {
					source: source,
					images: images
				};
	//			console.log('importData = ' + importData);
	//			request.post({url: urlApi + '/imports', json: importData}, function(err, res, data) {
	//				console.log('Import (' + response.statusCode + ' ' + err + ')');
	//				console.log(data);
	//			});
			});
		});
	});
}

function convertImage($, tableRow, callback) {
	var image = {};
	var itemRows = $(tableRow).find('td');
			
	// Person
	var nameSpan = $(itemRows[1]).find('span');
	if (nameSpan.find('span').length) {
		nameSpan = nameSpan.find('span');
	}
	var names = nameSpan.text().split(',');
	image.person = {
		lastName: names[0].trim(),
		firstName: names[1].trim()
	};
	console.log('- ' + image.person.lastName + ', ' + image.person.firstName);

	// Image
	var imageTag = $(itemRows[0]).find('img');
	image.imageUrl = uriSource.protocol + imageTag.attr('src');
	image.imageUrl = image.imageUrl.replace('/100px-', '/1024px-'); // width
	
	var linkTag = $(itemRows[0]).find('a');
	image.imageCanonicalUrl = linkTag.attr('href');
	image.imageCanonicalUrl = image.imageCanonicalUrl.replace('/wiki/Datei:', '');

	// Location
	image.location = {
		street: $(itemRows[2]).text().trim(),
		city: "Berlin"
	};
	
	callback(null, image);
}

function patchImage(image, callback) {
	if (/Photo-request.svg.png$/.test(image.imageUrl)) {
		delete image.imageUrl;
		delete image.imageCanonicalUrl;
	}
	
	callback(null, image);
}

function addSourceToImage(source, image, callback) {
	image.source = source;
	
	callback(null, image);
}