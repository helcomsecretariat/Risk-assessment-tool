define([
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo",
	"dojo/on",
	"dojo/dom",
	"dojo/_base/array",
	"dijit/registry",
	"dijit/layout/TabContainer",
	"dijit/layout/ContentPane",
	"widgets/infoSection",
	"widgets/exemptionsSection",
	"widgets/searchSection",
	"widgets/resultsSection",
	"widgets/targetSpeciesSection",
	"widgets/routesSection",
	//"widgets/dataSection",
	"widgets/helpSection",
	"widgets/testSection",
	"widgets/targetSpeciesSection2",
	"widgets/routesSection2",
	"dojo/text!../widgets/templates/testSection.html",
	"dojo/text!../widgets/templates/targetSpeciesSection.html",
	"dojo/text!../widgets/templates/routesSection.html",
	"dojo/domReady!"
], function(
	declare,
	lang,
	dojo,
	on,
	dom,
	array,
	registry,
	TabContainer,
	ContentPane,
	infoSection,
	exemptionsSection,
	searchSection,
	resultsSection,
	targetSpeciesSection,
	routesSection,
	//dataSection,
	helpSection,
	testSection,
	targetSpeciesSection2,
	routesSection2,
	testSectionHtml,
	targetSpeciesSectionHtml,
	routesSectionHtml
){
	return declare(null, {
		selectedTab: null,
		map: null,
		mapConfig: null,
		startExtent: null,
		startCenter: null,
		startZoom: null,
		layers: null,

		tabContainer: null,
		infoSection: null,
		exemptionsSection: null,
		searchSection: null,
		resultsSection: null,
		targetSpeciesSection: null,
		routesSection: null,
		dataSection: null,
		helpSection: null,
		testSection: null,
		targetSpeciesObj: null,
		routesObj: null,
		tc: null,

		services: null,

		constructor: function(params) {
			console.log("left panel");
			this.map = params.map;
			//this.mapConfig = params.mapConfig,
			//this.startExtent = this.map.extent;
			//this.startCenter = this.map.center;
			//this.startZoom = this.map.getZoom();
			this.services = params.services;
			this.layers = params.layers;

			/*this.tc = new TabContainer({
				region: "left",
				splitter: true,
        style: "height: 100%; width: 100%; border-right: 2px solid #00497F;"
    	}, "tbctnr");*/
			//this.tc.startup();

			this.setupTargetSpeciesTask();
			this.setupRoutesTask();

			/**/

			//this.setupInfoTask();
			//this.setupExemptionsTask();
			//this.setupSearchTask();
			//this.setupTargetSpeciesTask();
			//this.setupRoutesTask();
			//this.setupDataTask();
			//this.setupHelpTask();
			//this.setupTestTask();


			/*var cp1 = new ContentPane({
         title: "Food",
         content: testSectionHtml
    	});


			console.log(this.tc);
			this.tc.addChild(cp1);*/
			console.log("console.log(this.tc);", this.tc);
		},

		setupInfoTask: function() {
			var infoContainer = dom.byId("infoContainer");
			this.infoSection = new infoSection().placeAt(infoContainer);
		},

		setupExemptionsTask: function() {
			var exemptionsContainer = dom.byId("exemptionsContainer");
			this.exemptionsSection = new exemptionsSection().placeAt(exemptionsContainer);
		},

		/*setupSearchTask: function() {
			var searchContainer = dom.byId("searchContainer");
			this.resultsSection = new resultsSection({map: this.map}).placeAt(searchContainer);
			this.searchSection = new searchSection({map: this.map, layers: this.layers, services: this.services, resultSection: this.resultsSection}).placeAt(searchContainer);

			on(this.searchSection.searchButtonTop, "click", lang.hitch(this, function() {
				this.searchButtonClick();
			}));

			on(this.searchSection.searchButtonBottom, "click", lang.hitch(this, function() {
				this.searchButtonClick();
			}));

			on(this.searchSection.clearFiltersButtonTop, "click", lang.hitch(this, function() {
				this.searchSection.resetFilters();
			}));

			on(this.searchSection.clearFiltersButtonBottom, "click", lang.hitch(this, function() {
				this.searchSection.resetFilters();
			}));

			on(this.resultsSection.updateSearchButton, "click", lang.hitch(this, function() {
				this.searchSection.restoreSearch();
				//this.map.setExtent(this.startExtent, true);
				//this.map.centerAndZoom(this.startCenter, this.startZoom);
				document.getElementById("searchSection").style.display = "block";
				document.getElementById("resultsSection").style.display = "none";
			}));

			on(this.resultsSection.newSearchButton, "click", lang.hitch(this, function() {
				this.searchSection.restoreSearch();
				this.searchSection.resetFilters();
				//this.map.setExtent(this.startExtent, true);
				//this.map.centerAndZoom(this.startCenter, this.startZoom);
				document.getElementById("searchSection").style.display = "block";
				document.getElementById("resultsSection").style.display = "none";
			}));
		},

		searchButtonClick: function() {
			this.startCenter = this.map.center;
			this.startZoom = this.map.getZoom();
			if (this.searchSection.setFiltersForResultView()) {
				document.getElementById("loadingCover").style.display = "block";
				this.map.graphics.setVisibility(false);

				array.forEach(this.searchSection.layers, lang.hitch(this, function(layer) {
					this.searchSection.countObservations(layer);
				}));

				document.getElementById("searchSection").style.display = "none";
				document.getElementById("resultsSection").style.display = "block";
			}
			else {
				alert("No search filters selected.");
			}
		},*/

		setupTargetSpeciesTask2: function() {
			var targetSpeciesContainer = dom.byId("targetSpeciesContainer");
			this.targetSpeciesSection = new targetSpeciesSection({targetSpeciesService: this.services.ra_target_species}).placeAt(targetSpeciesContainer);
		},

		setupRoutesTask2: function() {
			var routesContainer = dom.byId("routesContainer");
			this.routesSection = new routesSection({obsPointsService: this.services.observations, portsPointsService: this.services.ports, map: this.map, layers: this.layers}).placeAt(routesContainer);
		},

		setupDataTask: function() {
			var dataContainer = dom.byId("dataContainer");
			this.dataSection = new dataSection().placeAt(dataContainer);
		},

		setupHelpTask: function() {
			var helpContainer = dom.byId("helpContainer");
			this.helpSection = new helpSection().placeAt(helpContainer);
		},

		setupTestTask: function() {
			var leftPanelContainer = dom.byId("leftPanelContainer");
			this.testSection = new testSection().placeAt(leftPanelContainer);
		},

		setupTargetSpeciesTask: function() {
			var cp = new ContentPane({
         title: "Target Species",
         content: targetSpeciesSectionHtml
    	});
			this.tc.addChild(cp);
			this.targetSpeciesObj = new targetSpeciesSection2({targetSpeciesService: this.services.ra_target_species});
			//dijit.byId("mainWindow").resize();

			on(cp, "show", lang.hitch(this, function() {
				document.getElementById("tbctnr").style.width = "100%";
				dijit.byId("mainWindow").resize();
			}));
		},

		setupRoutesTask: function() {
			var cp = new ContentPane({
         title: "Routes",
         content: routesSectionHtml
    	});
			this.tc.addChild(cp);
			this.routesObj = new routesSection2({obsPointsService: this.services.observations, portsPointsService: this.services.ports, map: this.map, layers: this.layers});
			//dijit.byId("mainWindow").resize();

			on(cp, "show", lang.hitch(this, function() {
				//console.log("cp.title", cp.title);
				document.getElementById("tbctnr").style.width = "50%";
				dijit.byId("mainWindow").resize();

				this.map.resize();
				this.map.reposition();

				setTimeout(setupTasks, 3000);

				var obj = this.routesObj;
				function setupTasks() {
					obj.zoomToPorts();
				}
			}));

		}
	});
});
