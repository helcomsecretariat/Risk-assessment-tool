define([
	"dojo/_base/declare",
	"dojo/dom",
	"dojo/_base/lang",
	"dojo/dom-style",
	"dojo/_base/array",
	"dojo/on",
	"esri/map", //"esri/geometry/webMercatorUtils",
	"esri/InfoTemplate", "esri/layers/GraphicsLayer", "esri/symbols/SimpleMarkerSymbol", "esri/symbols/SimpleLineSymbol", "esri/Color",
	"widgets/infoSection", "widgets/exemptionsSection", "widgets/targetSpeciesSection", "widgets/routesSection", "widgets/searchSection", "widgets/helpSection"
], function(
	declare, dom, lang, domStyle, array, on,
	Map, //webMercatorUtils,
	InfoTemplate, GraphicsLayer, SimpleMarkerSymbol, SimpleLineSymbol, Color,
	infoSection, exemptionsSection, targetSpeciesSection, routesSection, searchSection, helpSection
) {
	return declare(null, {
		map: null,
		tabs: {
			e: null,
			i: null,
			ts: null,
			r: null,
			s: null,
			h: null
		},
		layers: {
			observations: {},
			ports: {},
			startPortHighlight: {},
			endPortHighlight: {},
			observationsHighlight: {},
			accumPortHighlight: {}
		},

		constructor: function(params) {
			let services = params.services;
			let samplingGroups = params.samplingGroups;
			let speciesFields = params.speciesFields;
			let obsFields = params.obsFields;
			let portFields = params.portFields;
			let dataPopup = params.dataPopup;

			this.map = new Map("map", {
				basemap: "gray-vector",
				center: [103.53884887692445, 40.37127234284249],
        zoom: 4,
        sliderPosition: "top-right"
      });

			this.map.on("load", lang.hitch(this, function(layer) {
				this.setupLayers();
				this.tabs.i = new infoSection();
				this.tabs.e = new exemptionsSection();
				this.tabs.ts = new targetSpeciesSection({
					targetSpeciesService: services.ra_target_species,
					speciesService: services.species,
					dataPopup: dataPopup,
					speciesFields: speciesFields
				});
				this.tabs.r = new routesSection({
					obsPointsService: services.observations,
					portsPointsService: services.ports,
					speciesService: services.species,
					pdfService: services.pdf,
					checkSamplingService: services.checkSampling,
					map: this.map,
					layers: this.layers,
					dataPopup: dataPopup,
					samplingGroups: samplingGroups,
					speciesFields: speciesFields,
					portFields: portFields
				});
				this.tabs.s = new searchSection({
					map: this.map, layers:
					this.layers,
					services: services,
					dataPopup: dataPopup,
					samplingGroups: samplingGroups,
					obsFields: obsFields,
				});
				this.tabs.h = new helpSection();
				dijit.byId("mainWindow").resize();
			}));
		},

		setupLayers: function() {
			this.layers.observations.infoTemplate = new InfoTemplate("${scientific_name} - observation information", null);
			this.layers.observations.graphicsLayer = new GraphicsLayer();
			this.layers.observations.graphicsLayer.setInfoTemplate(this.layers.observations.infoTemplate);
			this.layers.observations.graphicsLayer.setVisibility(false);
			this.map.addLayer(this.layers.observations.graphicsLayer);
			this.layers.observations.symbol = new SimpleMarkerSymbol(
				SimpleMarkerSymbol.STYLE_CIRCLE,
				8,
				new SimpleLineSymbol(
					SimpleLineSymbol.STYLE_SOLID,
					new Color([0, 0, 255, 0.9]),
					1
				),
				new Color([0, 0, 0, 0.0])
			);

			this.layers.ports.infoTemplate = new InfoTemplate("${harbour_name} - port information", null);
			this.layers.ports.graphicsLayer = new GraphicsLayer();
			this.layers.ports.graphicsLayer.setInfoTemplate(this.layers.ports.infoTemplate);
			this.layers.ports.graphicsLayer.setVisibility(false);
			this.map.addLayer(this.layers.ports.graphicsLayer);
			this.layers.ports.symbol = new SimpleMarkerSymbol(
				SimpleMarkerSymbol.STYLE_CIRCLE,
				12,
				new SimpleLineSymbol(
					SimpleLineSymbol.STYLE_SOLID,
					new Color([0, 0, 0, 0.9]),
					1
				),
				new Color([0, 0, 255, 0.0])
			);

			this.layers.startPortHighlight.graphicsLayer = new GraphicsLayer();
			this.map.addLayer(this.layers.startPortHighlight.graphicsLayer);
			this.layers.startPortHighlight.symbol = new SimpleMarkerSymbol(
				SimpleMarkerSymbol.STYLE_CIRCLE,
				12,
				new SimpleLineSymbol(
					SimpleLineSymbol.STYLE_SOLID,
					new Color([0, 255, 0, 1.0]),
					2
				),
				new Color([0, 0, 0, 0.0])
			);

			this.layers.endPortHighlight.graphicsLayer = new GraphicsLayer();
			this.map.addLayer(this.layers.endPortHighlight.graphicsLayer);
			this.layers.endPortHighlight.symbol = new SimpleMarkerSymbol(
				SimpleMarkerSymbol.STYLE_CIRCLE,
				12,
				new SimpleLineSymbol(
					SimpleLineSymbol.STYLE_SOLID,
					new Color([255, 0, 0, 1.0]),
					2
				),
				new Color([0, 0, 0, 0.0])
			);

			this.layers.observationsHighlight.graphicsLayer = new GraphicsLayer();
			this.map.addLayer(this.layers.observationsHighlight.graphicsLayer);
			this.layers.observationsHighlight.symbol = new SimpleMarkerSymbol(
				SimpleMarkerSymbol.STYLE_SQUARE,
				14,
				new SimpleLineSymbol(
					SimpleLineSymbol.STYLE_SOLID,
					new Color([255, 127, 80, 1.0]),
					4
				),
				new Color([0, 0, 0, 0.0])
			);

			this.layers.accumPortHighlight.graphicsLayer = new GraphicsLayer();
			this.map.addLayer(this.layers.accumPortHighlight.graphicsLayer);
			this.layers.accumPortHighlight.symbol = new SimpleMarkerSymbol(
				SimpleMarkerSymbol.STYLE_CIRCLE,
				12,
				new SimpleLineSymbol(
					SimpleLineSymbol.STYLE_SOLID,
					new Color([0, 255, 255, 1.0]),
					2
				),
				new Color([0, 0, 0, 0.0])
			);
		}
  });
});
