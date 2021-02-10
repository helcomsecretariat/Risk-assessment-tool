define([
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/on",
	"dojo/dom",
	"dijit/layout/TabContainer",
	"dijit/layout/ContentPane",
	"app/js/startupWindow",
	"app/js/mapManager",
	"widgets/dataPopup",
	"dojo/text!../widgets/templates/infoSection.html",
	"dojo/text!../widgets/templates/exemptionsSection.html",
	"dojo/text!../widgets/templates/targetSpeciesSection.html",
	"dojo/text!../widgets/templates/routesSection.html",
	"dojo/text!../widgets/templates/searchSection.html",
	"dojo/text!../widgets/templates/helpSection.html",
	"dojo/domReady!"
], function(
	declare, lang, on, dom,
	TabContainer,
	ContentPane,
	startupWindow, mapManager, dataPopup,
	infoSectionHtml, exemptionsSectionHtml, targetSpeciesSectionHtml, routesSectionHtml, searchSectionHtml, helpSectionHtml
) {
	return declare(null, {
		mM: null,
		dataPopup: null,
		loaded: false,

		constructor: function() {
			this.showStartupBox();
			this.setupPanes();

			var windowUrl = window.location.pathname;
      windowUrl = windowUrl.replace("index.html", "");

			fetch(windowUrl + appVersion + "/config/config.json")
				.then(lang.hitch(this, function(response) {
					return response.text();
				}))
				.then(lang.hitch(this, function(text) {
					var resp = JSON.parse(text);
					this.dataPopup = new dataPopup();
					this.mM = new mapManager({
						mapNode: "map",
						dataPopup: this.dataPopup,
						services: resp.services,
						samplingGroups: resp.samplingGroups,
						speciesFields: resp.speciesFields,
						obsFields: resp.obsFields,
						portFields: resp.portFields
					});
				}));
		},

		showStartupBox: function() {
			var startupBoxDiv = dom.byId("startupBox");
			document.getElementById("screenCover").style.display = "block";
			document.getElementById("startupBox").style.display = "block";
			var startBox = new startupWindow().placeAt(startupBoxDiv);
		},

		setupPanes: function() {
			// setup tab container
			var tc = new TabContainer({
				region: "left",
				splitter: true,
        style: "height: 100%; width: 100%; border-right: 2px solid #00497F;"
    	}, "tbctnr");

			//setup information tab
			var cpi = new ContentPane({
         title: "Information",
         content: infoSectionHtml
    	});
			tc.addChild(cpi);

			on(cpi, "show", lang.hitch(this, function() {
				// important, not to call function when tab is shown for the first time.
				if (this.loaded) {
					document.getElementById("tbctnr").style.width = "100%";
					dijit.byId("mainWindow").resize();
				}
			}));

			// setup exemptions tab
			var cpe = new ContentPane({
         title: "Exemptions",
         content: exemptionsSectionHtml
    	});
			tc.addChild(cpe);

			on(cpe, "show", lang.hitch(this, function() {
				document.getElementById("tbctnr").style.width = "100%";
				dijit.byId("mainWindow").resize();
				this.loaded = true;
			}));

			//setup target species tab
			var cpts = new ContentPane({
         title: "Target Species",
         content: targetSpeciesSectionHtml
    	});
			tc.addChild(cpts);

			on(cpts, "show", lang.hitch(this, function() {
				document.getElementById("tbctnr").style.width = "100%";
				dijit.byId("mainWindow").resize();
				this.loaded = true;
			}));

			// setup routes tab
			var cpr = new ContentPane({
         title: "Routes",
         content: routesSectionHtml
    	});
			tc.addChild(cpr);

			on(cpr, "show", lang.hitch(this, function() {
				document.getElementById("tbctnr").style.width = "50%";
				dijit.byId("mainWindow").resize();
				this.mM.layers.ports.graphicsLayer.setVisibility(true);
				this.mM.layers.startPortHighlight.graphicsLayer.setVisibility(true);
				this.mM.layers.endPortHighlight.graphicsLayer.setVisibility(true);
				this.mM.map.infoWindow.resize(300, 300);
				setTimeout(lang.hitch(this, function() {
					this.mM.tabs.r.zoomToPorts();
				}), 1000);

				this.loaded = true;
			}));

			on(cpr, "hide", lang.hitch(this, function() {
				this.mM.layers.ports.graphicsLayer.setVisibility(false);
				this.mM.layers.startPortHighlight.graphicsLayer.setVisibility(false);
				this.mM.layers.endPortHighlight.graphicsLayer.setVisibility(false);
				this.mM.map.infoWindow.hide();
			}));

			// setup search tab
			var cps = new ContentPane({
         title: "Data",
         content: searchSectionHtml
    	});
			tc.addChild(cps);

			on(cps, "show", lang.hitch(this, function() {
				document.getElementById("tbctnr").style.width = "50%";
				dijit.byId("mainWindow").resize();
				this.mM.layers.observationsHighlight.graphicsLayer.setVisibility(true);
				this.mM.map.infoWindow.resize(400, 400);

				this.loaded = true;
			}));

			on(cps, "hide", lang.hitch(this, function() {
				document.getElementById("searchPortContainer").style.display = "none";
				document.getElementById("searchAquaContainer").style.display = "none";
				document.getElementById("downloadContainer").style.display = "none";
				document.getElementById("accumulationContainer").style.display = "none";
				document.getElementById("resultInfoContainer").style.display = "none";
				this.mM.layers.observations.graphicsLayer.setVisibility(false);
				this.mM.layers.observationsHighlight.graphicsLayer.setVisibility(false);
				this.mM.layers.ports.graphicsLayer.setVisibility(false);
				this.mM.layers.accumPortHighlight.graphicsLayer.setVisibility(false);
				this.mM.map.infoWindow.hide();
			}));

			// setup help tab
			var cph = new ContentPane({
         title: "Help",
         content: helpSectionHtml
    	});
			tc.addChild(cph);

			on(cph, "show", lang.hitch(this, function() {
				document.getElementById("tbctnr").style.width = "100%";
				dijit.byId("mainWindow").resize();
				this.loaded = true;
			}));

			tc.startup();
		}
	});
});
