webpackJsonp([8],[
/* 0 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function($) {'use strict';
	
	var Datamap = __webpack_require__(!(function webpackMissingModule() { var e = new Error("Cannot find module \"datamaps\""); e.code = 'MODULE_NOT_FOUND'; throw e; }()));
	
	// show world map
	var partnerMap = new Datamap({
	  element: document.getElementById("plot-map-container"),
	  geographyConfig: {
	    popupOnHover: false,
	    highlightOnHover: false
	  },
	  fills: {
	    defaultFill: '#74bbfa',
	    partner: '#DD671A'
	  },
	  responsive: true
	});
	
	// add partner circles
	partnerMap.bubbles(partnerPoints.map(function (partner) {
	  return {
	    name: partner[2],
	    radius: 5,
	    latitude: partner[0],
	    longitude: partner[1],
	    fillKey: 'partner'
	  };
	}), {
	  popupTemplate: function popupTemplate(geo, data) {
	    return '<div class="hoverinfo">' + data.name + '</div>';
	  },
	  borderWidth: 1,
	  fillOpacity: 1
	});
	
	// resize map on window change
	$(window).on('resize', function () {
	  partnerMap.resize();
	});
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(1)))

/***/ }
]);
//# sourceMappingURL=map.js.map