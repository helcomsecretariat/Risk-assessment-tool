define([
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo",
	"dojo/on",
	"dojo/dom",
	"dojo/dom-construct",
	"dojo/_base/array",
	"dojo/store/Memory", "dijit/form/FilteringSelect", "dijit/form/Select",
	"dojox/form/CheckedMultiSelect", "dojo/data/ItemFileReadStore",
	"dijit/form/CheckBox", "dijit/TitlePane", "dijit/Tooltip", "dijit/Dialog",
	"esri/request", "esri/tasks/query", "esri/tasks/QueryTask",
	"esri/toolbars/draw", "esri/symbols/SimpleMarkerSymbol", "esri/symbols/SimpleLineSymbol", "esri/symbols/SimpleFillSymbol", "esri/Color", "esri/graphic",
	"esri/geometry/Extent", "esri/SpatialReference", "esri/graphicsUtils", "esri/InfoTemplate", "esri/layers/GraphicsLayer", "esri/graphicsUtils",
	"widgets/dataTable",
	"dojox/charting/Chart", "dojox/charting/themes/MiamiNice", "dojox/charting/plot2d/Lines", "dojox/charting/action2d/Tooltip", "dojox/charting/action2d/Magnify",
	"dojox/charting/plot2d/Markers", "dojox/charting/axis2d/Default"
], function(
	declare,
	lang,
	dojo,
	on,
	dom,
	domConstruct,
	array,
	Memory, FilteringSelect, Select,
	CheckedMultiSelect, ItemFileReadStore,
	CheckBox, TitlePane, Tooltip, Dialog,
	esriRequest, Query, QueryTask,
	Draw, SimpleMarkerSymbol, SimpleLineSymbol, SimpleFillSymbol, Color, Graphic,
	Extent, SpatialReference, graphicsUtils, InfoTemplate, GraphicsLayer, graphicsUtils,
	dataTable,
	Chart, chartTheme, LinesPlot, ChartTooltip, Magnify
){
	return declare(null, {
		viewMode: null,
		map: null,
		layers: null,
		services: null,
		obsFields: null,
		dataPopup: null,
		/*uniqueDataReceived: {
			names: false,
			ports: false,
			samplingGroups: false,
			raCategories: false,
		},*/
		portsMultiSelect: null,
		samplingGroupsMultiSelect: null,
		raCategoriesMultiSelect: null,
		queryFilters: {
			extent: null,
			species_name: null,
			ports: null,
			samplingGroups: null,
			raCategories: null,
			year1: "",
			year2: ""
		},
		featuresFoundCount: null,
		portTable: null,
		aquaTable: null,
		popupDialog: null,
		samplingGroupNames: [],
		samplingGroups: null,

		constructor: function(params) {
			this.map = params.map;
			this.layers = params.layers;
			this.services = params.services;
			this.obsFields = params.obsFields;
			this.dataPopup = params.dataPopup;
			this.samplingGroups = params.samplingGroups;
			this.postCreate();
		},

		postCreate: function() {

			this.setupPortsSearch();
			this.setupAquaSearch();
			this.setupDownload();
			this.setupAccumulation();
			this.setupResults();

			on(dojo.byId("obsYear1Input"), "change", lang.hitch(this, function() {
				let y1 = dojo.byId("obsYear1Input").value;
				if ((!isNaN(y1)) || (y1 == "")) {
					this.queryFilters.year1 = y1;
				}
				else {
					alert("Wrong year value.");
					dojo.byId("obsYear1Input").value = "";
				}
			}));
			on(dojo.byId("obsYear2Input"), "change", lang.hitch(this, function() {
				let y2 = dojo.byId("obsYear2Input").value;
				if ((!isNaN(y2)) || (y2 == "")) {
					this.queryFilters.year2 = y2;
				}
				else {
					alert("Wrong year value.");
					dojo.byId("obsYear2Input").value = "";
				}
			}));

			/*this.drawTool = new Draw(this.map);
			this.extentSymbol = new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID, new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, new Color([255,0,0]), 2),new Color([255,255,0,0.25]));
			on(this.drawExtentLink, "click", lang.hitch(this, function() {
				this.map.graphics.clear();
				this.map.disableMapNavigation();
        this.drawTool.activate("extent");
				this.cancelExtentLink.style.display = "inline";
			}));
			on(this.cancelExtentLink, "click", lang.hitch(this, function() {
				this.map.graphics.clear();
				this.drawTool.deactivate();
	      this.map.enableMapNavigation();
				this.cancelExtentLink.style.display = "none";
			}));
			on(this.drawTool, "draw-end", lang.hitch(this, function(evt) {
				this.map.graphics.add(new Graphic(evt.geometry, this.extentSymbol));
				this.drawTool.deactivate();
	      this.map.enableMapNavigation();
				this.cancelExtentLink.style.display = "none";
				this.convertCoordinates(evt.geometry);
			}));*/
		},

		setupPortsSearch: function() {
			new Tooltip({
				connectId: dojo.byId("portSearchButton"),
				position: ["below"],
				label: "Search for species observation locations in ports."
			});

			document.getElementById("portSearchButton").onclick = lang.hitch(this, function() {
				this.viewMode = "PORT";
				document.getElementById("searchPortContainer").style.display = "block";
				document.getElementById("searchAquaContainer").style.display = "none";
				document.getElementById("downloadContainer").style.display = "none";
				document.getElementById("accumulationContainer").style.display = "none";
				document.getElementById("resultInfoContainer").style.display = "none";
				this.layers.observations.graphicsLayer.setVisibility(true);
				this.layers.ports.graphicsLayer.setVisibility(false);
				this.layers.observationsHighlight.graphicsLayer.clear();
				this.layers.observationsHighlight.graphicsLayer.setVisibility(true);
				this.layers.accumPortHighlight.graphicsLayer.setVisibility(false);
				this.map.infoWindow.hide();
				this.resetPortFilters();
				this.resetAquaFilters();
			});

			var portTp = new TitlePane({title: "Port"});
	    dojo.byId("portFilterSection").appendChild(portTp.domNode);
    	portTp.startup();

			var samplingGroupTp = new TitlePane({title: "Sampling Group"});
	    dojo.byId("samplingGroupFilterSection").appendChild(samplingGroupTp.domNode);
    	samplingGroupTp.startup();

			var raCategoryTp = new TitlePane({title: "Risk assessment category"});
	    dojo.byId("raCategoryFilterSection").appendChild(raCategoryTp.domNode);
    	raCategoryTp.startup();

			this.getUniqueFiltersForPortSearch(portTp, samplingGroupTp, raCategoryTp);

			document.getElementById("searchButtonPortTop").onclick = lang.hitch(this, function() {
				this.searchInPortsClick();
			});
			document.getElementById("clearFiltersButtonPortTop").onclick = lang.hitch(this, function() {
				this.resetPortFilters();
			});
			document.getElementById("clearMapButtonPortTop").onclick = lang.hitch(this, function() {
				this.clearMap();
			});
			document.getElementById("searchButtonPortBottom").onclick = lang.hitch(this, function() {
				this.searchInPortsClick();
			});
			document.getElementById("clearFiltersButtonPortBottom").onclick = lang.hitch(this, function() {
				this.resetPortFilters();
			});
			document.getElementById("clearMapButtonPortBottom").onclick = lang.hitch(this, function() {
				this.clearMap();
			});
		},

		setupAquaSearch: function() {
			new Tooltip({
				connectId: dojo.byId("aquaSearchButton"),
				position: ["below"],
				label: "Search for AquaNIS species observation locations."
			});

			document.getElementById("aquaSearchButton").onclick = lang.hitch(this, function() {
				this.viewMode = "AQUA";
				document.getElementById("searchPortContainer").style.display = "none";
				document.getElementById("searchAquaContainer").style.display = "block";
				document.getElementById("downloadContainer").style.display = "none";
				document.getElementById("accumulationContainer").style.display = "none";
				document.getElementById("resultInfoContainer").style.display = "none";
				this.layers.observations.graphicsLayer.setVisibility(false);
				this.layers.ports.graphicsLayer.setVisibility(false);
				this.layers.observationsHighlight.graphicsLayer.clear();
				this.layers.observationsHighlight.graphicsLayer.setVisibility(true);
				this.layers.accumPortHighlight.graphicsLayer.setVisibility(false);
				this.map.infoWindow.hide();
				this.resetPortFilters();
				this.resetAquaFilters();
			});

			this.getUniqueFiltersForAquaSearch();

			document.getElementById("searchButtonAquaBottom").onclick = lang.hitch(this, function() {
				this.searchInAquaClick();
			});
			document.getElementById("clearFiltersButtonAquaBottom").onclick = lang.hitch(this, function() {
				this.resetAquaFilters();
			});
			document.getElementById("clearMapButtonAquaBottom").onclick = lang.hitch(this, function() {
				this.clearMap();
			});
		},

		setupDownload: function() {
			new Tooltip({
				connectId: dojo.byId("downloadButton"),
				position: ["below"],
				label: "Download species observation data."
			});

			document.getElementById("downloadButton").onclick = lang.hitch(this, function() {
				this.viewMode = "DOWNLOAD";
				document.getElementById("searchPortContainer").style.display = "none";
				document.getElementById("searchAquaContainer").style.display = "none";
				document.getElementById("downloadContainer").style.display = "block";
				document.getElementById("accumulationContainer").style.display = "none";
				document.getElementById("resultInfoContainer").style.display = "none";
				this.layers.observations.graphicsLayer.setVisibility(false);
				this.layers.ports.graphicsLayer.setVisibility(false);
				this.layers.observationsHighlight.graphicsLayer.setVisibility(false);
				this.layers.accumPortHighlight.graphicsLayer.setVisibility(false);
				this.map.infoWindow.hide();
			});
		},

		setupAccumulation: function() {
			new Tooltip({
				connectId: dojo.byId("accumulationButton"),
				position: ["below"],
				label: "View species accumulation curves in ports."
			});

			document.getElementById("accumulationButton").onclick = lang.hitch(this, function() {
				this.viewMode = "ACCUM";
				document.getElementById("searchPortContainer").style.display = "none";
				document.getElementById("searchAquaContainer").style.display = "none";
				document.getElementById("downloadContainer").style.display = "none";
				document.getElementById("accumulationContainer").style.display = "block";
				document.getElementById("resultInfoContainer").style.display = "none";
				this.layers.observations.graphicsLayer.setVisibility(false);
				this.layers.ports.graphicsLayer.setVisibility(true);
				this.layers.observationsHighlight.graphicsLayer.setVisibility(false);
				this.layers.accumPortHighlight.graphicsLayer.setVisibility(true);
				this.map.setExtent(graphicsUtils.graphicsExtent(this.layers.ports.graphicsLayer.graphics), true);
				this.map.infoWindow.hide();
			});
		},

		setupResults: function() {
			document.getElementById("updateSearchButtonTop").onclick = lang.hitch(this, function() {
				this.updateSearchButtonClick();
			});
			document.getElementById("newSearchButtonTop").onclick = lang.hitch(this, function() {
				this.newSearchButtonClick();
			});
			document.getElementById("updateSearchButtonBottom").onclick = lang.hitch(this, function() {
				this.updateSearchButtonClick();
			});
			document.getElementById("newSearchButtonBottom").onclick = lang.hitch(this, function() {
				this.newSearchButtonClick();
			});
			this.setupResultsPortGrid();
			this.setupResultsAquaGrid();

			this.popupDialog = new Dialog({
				style: "max-width: 400px;"
    	});
		},

		updateSearchButtonClick: function() {
			if (this.viewMode == "PORT") {
				document.getElementById("searchPortContainer").style.display = "block";
				document.getElementById("resultInfoContainer").style.display = "none";
				this.portTable.resetFilter();
			}
			else if (this.viewMode == "AQUA") {
				document.getElementById("searchAquaContainer").style.display = "block";
				document.getElementById("resultInfoContainer").style.display = "none";
				this.aquaTable.resetFilter();
			}
		},

		newSearchButtonClick: function() {
			if (this.viewMode == "PORT") {
				this.resetPortFilters();
				this.clearMap();
				document.getElementById("searchPortContainer").style.display = "block";
				document.getElementById("resultInfoContainer").style.display = "none";
				this.portTable.resetFilter();
			}
			else if (this.viewMode == "AQUA") {
				this.resetAquaFilters();
				this.clearMap();
				document.getElementById("searchAquaContainer").style.display = "block";
				document.getElementById("resultInfoContainer").style.display = "none";
				this.aquaTable.resetFilter();
			}
		},

		setupResultsPortGrid: function() {
			let resultTableLayout = [
				{
					noscroll: true,
					cells: [
						{ field: "scientific_name", name: "Scientific name", datatype: "string", width: "100px", formatter: this.createLink}
          ]
				},
				{
					cells: [
						{ field: "taxonomical_status", name: "Taxonomical status", datatype: "string", width: "auto"},
			    	{ field: "accepted_name", name: "Accepted name", datatype: "string", width: "auto"},
			    	{ field: "species_group", name: "Species group", datatype: "string", width: "auto"},
			    	{ field: "sampling_group", name: "Sampling group", datatype: "string", width: "auto"},
			    	{ field: "ra_category", name: "Risk assessment category", datatype: "string", width: "auto"},
			    	{ field: "harbour_name", name: "Harbour", datatype: "string", width: "auto"}
					]
				}
			];

			let uniqueValues = {
				"taxonomical_status": [],
				"species_group": [],
				"sampling_group": [],
				"ra_category": [],
				"harbour_name": []
			};
			let searchFields = ["scientific_name", "accepted_name"];
			let singleListFields = ["taxonomical_status", "species_group", "sampling_group", "ra_category", "harbour_name"];
			let complexListFields = [];
			let numberFields = [];

			if (!this.portTable) {
				this.portTable = new dataTable({
					divId: "searchPortDataGrid",
					uniqueValues: uniqueValues,
					searchFields: searchFields,
					singleListFields: singleListFields,
					complexListFields: complexListFields,
					numberFields: numberFields,
				});
			}
			this.portTable.changeLayout(resultTableLayout);
			on(this.portTable.grid,"CellClick", lang.hitch(this, function(evt) {
				if (evt.cell.field == "scientific_name") {
					let props = this.portTable.grid.selection.getSelected()[0];
					let data = {};
					for (var name in props) {
  					if ((props.hasOwnProperty(name)) && (!name.startsWith("_"))) {
							data[name] = props[name][0];
						}
					}
					let title = "Species observation information";
					if (data.scientific_name) {
						title = data.scientific_name + " - species observation information";
					}
					this.dataPopup.showPopup(title, this.obsFields, data);
					this.highlightOnTheMap(props["id"][0]);
				}
			}));
		},

		setupResultsAquaGrid: function() {
			let resultTableLayout = [
				{
					noscroll: true,
					cells: [
						{ field: "scientific_name", name: "Scientific name", datatype: "string", width: "100px", formatter: this.createLink}
          ]
				},
				{
					cells: [
						{ field: "taxonomical_status", name: "Taxonomical status", datatype: "string", width: "auto"},
			    	{ field: "accepted_name", name: "Accepted name", datatype: "string", width: "auto"},
						//{ field: "synonyms", name: "Synonyms", datatype: "string", width: "auto"},
			    	{ field: "species_url", name: "Species URL", datatype: "string", width: "50%", formatter: this.linkify}
					]
				}
			];

			let uniqueValues = {
				"taxonomical_status": []//,
				//"synonyms": []
			};
			let searchFields = ["scientific_name", "accepted_name", "species_url"];
			let singleListFields = ["taxonomical_status"];
			//let complexListFields = ["synonyms"];
			let complexListFields = [];
			let numberFields = [];

			if (!this.aquaTable) {
				this.aquaTable = new dataTable({
					divId: "searchAquaDataGrid",
					uniqueValues: uniqueValues,
					searchFields: searchFields,
					singleListFields: singleListFields,
					complexListFields: complexListFields,
					numberFields: numberFields,
				});
			}
			this.aquaTable.changeLayout(resultTableLayout);
			on(this.aquaTable.grid,"CellClick", lang.hitch(this, function(evt) {
				if (evt.cell.field == "scientific_name") {
					let props = this.aquaTable.grid.selection.getSelected()[0];
					console.log(props);
					let data = {};
					for (var name in props) {
  					if ((props.hasOwnProperty(name)) && (!name.startsWith("_"))) {
							data[name] = props[name][0];
						}
					}
					let title = "Species observation information";
					if (data.scientific_name) {
						title = data.scientific_name + " - species observation information";
					}
					this.dataPopup.showPopup(title, this.obsFields, data);
					this.highlightOnTheMap(props["id"][0]);
				}
			}));
		},

		createLink: function(data) {
			return ("<a href=#>"+data+"</a>");
		},

		linkify: function(text) {
			if (text) {
				let urlRegex =/(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;
				return text.replace(urlRegex, function(url) {
	      	return '<a href="' + url + '" target="_blank">' + url + '</a>';
	    	});
			}
			else {
				return text;
			}
		},

		highlightOnTheMap: function(id) {
			this.layers.observationsHighlight.graphicsLayer.clear();
			let url = "";
			if (this.viewMode == "PORT") {
				url = this.services.observations;
			}
			else if (this.viewMode == "AQUA") {
				url = this.services.observations_aquanis;
			}
			let qt = new QueryTask(url);
			let query = new Query();
			query.returnGeometry = true;
			query.outFields = ["id", "scientific_name"];
			query.where = "id = " + id;

			qt.execute(query, lang.hitch(this, function (featureSet) {
					let geom = null;
					array.forEach(featureSet.features, lang.hitch(this, function(graphic) {
						console.log(graphic);
						geom = graphic.geometry;
						graphic.setSymbol(this.layers.observationsHighlight.symbol);
						this.layers.observationsHighlight.graphicsLayer.add(graphic);
					}));
					this.map.centerAt(geom);
      	}),
      	lang.hitch(this, function (error) {
					console.log(error);
					//alert("Unable to get selected ports data. Try to reload page. Contact administrator at data@helcom.fi if alert appears again..");
				})
      );
		},

		cleanAccumContainer: function() {
			document.getElementById("notSelectedPortMessage").style.display = "none";
			document.getElementById("notDataForPortMessage").style.display = "none";

			array.forEach(this.samplingGroupNames, lang.hitch(this, function(name) {
				domConstruct.empty(dojo.byId(name.replace(/[^\w]/gi, '').toLowerCase()));
			}));
		},

		getSelectedPort: function(name) {
			var qt = new QueryTask(this.services.ports);
			var query = new Query();
			query.returnGeometry = true;
			query.outFields = ["harbour_name"];
			query.where = "harbour_name = '" + name + "'";

			qt.execute(query, lang.hitch(this, function (featureSet) {
					let geom = null;
					array.forEach(featureSet.features, lang.hitch(this, function(graphic) {
						geom = graphic.geometry;
						graphic.setSymbol(this.layers.accumPortHighlight.symbol);
						this.layers.accumPortHighlight.graphicsLayer.add(graphic);
					}));
					this.map.centerAt(geom);
      	}),
      	lang.hitch(this, function (error) {
					console.log(error);
					//alert("Unable to get selected ports data. Try to reload page. Contact administrator at data@helcom.fi if alert appears again..");
				})
      );
		},

		getDataForDiagrams: function(port) {
			document.getElementById("loadingCover").style.display = "block";
			let url = this.services.accumulation;
			url = url + "&Port=" + encodeURIComponent(port);
			url = url + "&Groups=" + encodeURIComponent(this.samplingGroupNames.join(";"));
			let requestHandle = esriRequest({
				url: url,
				handleAs: "json"
			});
			requestHandle.then(lang.hitch(this, function (response) {
					if ((response.results[0].paramName == "Result") && (response.results[0].value)) {
						if (response.results[0].value.length > 0) {
							this.displayDiagrams(port, response.results[0].value);
						}
						else {
							document.getElementById("notDataForPortMessage").style.display = "block";
						}
					}
					else {
						console.log(response);
						alert("Unable to perform download request. Try to reload page. Contact administrator at data@helcom.fi if alert appears again..");
					}
					document.getElementById("loadingCover").style.display = "none";
				}),
				lang.hitch(this, function (error) {
					document.getElementById("loadingCover").style.display = "none";
					console.log(error);
					alert("Unable to perform get data for accumulative curves request. Try to reload page. Contact administrator at data@helcom.fi if alert appears again..");
				})
			);
		},

		displayDiagrams: function(name, data) {
			this.cleanAccumContainer();
			document.getElementById("chartsContainerTitle").innerHTML = "Species accumulative curves for port " + name;
			document.getElementById("chartsContainer").style.display = "block";
			array.forEach(data, lang.hitch(this, function(record) {
				if (record.values.length > 0) {
					let chart = new Chart(record.title.replace(/[^\w]/gi, '').toLowerCase());
					chart.setTheme(chartTheme);
					chart.addPlot("default", {
						type: LinesPlot,
						markers: true
					});
					chart.addAxis("x", {title: "Number of sampling locations", titleOrientation: "away",  min: 0, max: record.values.length + 1, minorTicks: false});
					chart.addAxis("y", {title: "Accumulative number of species", vertical: true, min: Math.trunc(record.values[0]/10)*10, max: Math.trunc((record.values[record.values.length-1]+10)/10)*10, minorTicks: true});
					chart.addSeries("Species occurence", record.values);

					new ChartTooltip(chart,"default");
					new Magnify(chart,"default");
					chart.render();
				}
				else {
					document.getElementById(record.title.replace(/[^\w]/gi, '').toLowerCase()).innerHTML = "No data";
				}
			}));
		},

		getUniqueFiltersForPortSearch: function(portTp, samplingGroupTp, raCategoryTp) {
			var namesQueryTask = new QueryTask(this.services.unique_names);
			var portsQueryTask = new QueryTask(this.services.unique_harbours);
			var samplingGroupsQueryTask = new QueryTask(this.services.unique_sampling_groups);
			var raCategoriesQueryTask = new QueryTask(this.services.unique_ra_categories);

			var query = new Query();
			query.returnGeometry = false;
			query.where = "1=1";
			query.returnDistinctValues = true;

			query.outFields = ["name"];
			namesQueryTask.execute(query, lang.hitch(this, function (recordSet) {
					var names = [];
					array.forEach(recordSet.features, lang.hitch(this, function(feature) {
						names.push({name: feature.attributes.name, id: feature.attributes.name});
					}));

					var nameStore = new Memory({
						data: names
					});

					var speciesNameSelect = new FilteringSelect({
						id: "speciesNameInput",
						name: "speciesNameSearch",
						class: "searchInput",
						queryExpr: "*${0}*",
						autoComplete: false,
						required: false,
						forceWidth: true,
						hasDownArrow: false,
						placeHolder: "Species name",
						store: nameStore,
						searchAttr: "name",
						onChange: lang.hitch(this, function(value) {
							if (value) {
								this.queryFilters.species_name = value;
								document.getElementById("speciesNameStatusInfo").style.display = "none";
								document.getElementById("speciesAcceptedNameInfo").style.display = "none";
								document.getElementById("speciesNameStatus").innerHTML = "";
								document.getElementById("speciesAcceptedName").innerHTML = "";
								this.getSpeciesNameStatus(value);
							}
							else {
								this.queryFilters.species_name = null;
							}
						})
					}, dojo.byId("speciesNameInput")).startup();
					//this.uniqueDataReceived.names = true;
      	}),
      	lang.hitch(this, function (error) {
					//this.uniqueDataReceived.names = true;
					console.log(error);
					alert("Unable to get species names data. Try to reload page. Contact administrator at data@helcom.fi if alert appears again..");
				})
      );

			query.outFields = ["port_name"];
			portsQueryTask.execute(query, lang.hitch(this, function (recordSet) {
					var ports = {
						identifier: "value",
						label: "label",
						items: []
					};
					let portNames = [];
					array.forEach(recordSet.features, lang.hitch(this, function(feature) {
						ports.items.push({value: feature.attributes.port_name, label: feature.attributes.port_name});
						portNames.push(feature.attributes.port_name);
					}));
					var portStore = new ItemFileReadStore({
						data: ports
					});

					this.portsMultiSelect = new CheckedMultiSelect ({
						id:"portsSearchInput",
						dropDown: false,
						multiple: true,
						store: portStore,
						style : {width: "100%"},
						onChange: lang.hitch(this, function() {
							this.queryFilters.ports = this.portsMultiSelect.get("value");
						})
					}, portTp.containerNode);

					let options = [{label: "-- Select a port", value: "Null"}];
					array.forEach(portNames.sort(), lang.hitch(this, function(name) {
						options.push({label: name, value: name});
					}));

					new Select({
		        name: "portsSelect",
						class: "selectPort",
						options: options,
						onChange: lang.hitch(this, function(name) {
							this.layers.accumPortHighlight.graphicsLayer.clear();
							if (name == "Null") {
								document.getElementById("notSelectedPortMessage").style.display = "block";
							}
							else {
								this.getSelectedPort(name);
								this.getDataForDiagrams(name);
							}
						})
		    	}).placeAt(dojo.byId("portsSelectContainer")).startup();

					//this.uniqueDataReceived.ports = true;
      	}),
      	lang.hitch(this, function (error) {
					//this.uniqueDataReceived.ports = true;
					console.log(error);
					alert("Unable to get ports data. Try to reload page. Contact administrator at data@helcom.fi if alert appears again..");
				})
      );

			query.outFields = ["name"];
			samplingGroupsQueryTask.execute(query, lang.hitch(this, function (recordSet) {
					var samplingGroups = {
						identifier: "value",
						label: "label",
						items: []
					};
					//let groups = ["Benthos", "Fouling", "Mobile Epifauna", "Phytoplankton", "Zooplankton"];
					array.forEach(recordSet.features, lang.hitch(this, function(feature) {
						if (this.samplingGroups.includes(feature.attributes.name)) {
							samplingGroups.items.push({value: feature.attributes.name, label: feature.attributes.name});
							this.samplingGroupNames.push(feature.attributes.name);
						}
					}));
					var samplingGroupStore = new ItemFileReadStore({
						data: samplingGroups
					});

					this.samplingGroupsMultiSelect = new CheckedMultiSelect ({
						id:"samplingGroupsSearchInput",
						dropDown: false,
						multiple: true,
						store: samplingGroupStore,
						style : {width: "100%"},
						onChange: lang.hitch(this, function() {
							this.queryFilters.samplingGroups = this.samplingGroupsMultiSelect.get("value");
						})
					}, samplingGroupTp.containerNode);

					array.forEach(this.samplingGroupNames.sort(), lang.hitch(this, function(name) {
						let cont = domConstruct.create("div", {style: "width: 300px; height: 350px; float:left; border: black solid 1px; margin-right: 10px; margin-bottom: 10px;"}, dojo.byId("chartsContainer"), "last");
						domConstruct.create("div", {style: "width: 300px; margin-top: 10px; margin-bottom: 10px; font-size: 18px; text-align: center;", innerHTML: name}, cont, "last");
						domConstruct.create("div", {style: "width: 300px; height: 300px; font-size: 18px; text-align: center;", id: name.replace(/[^\w]/gi, '').toLowerCase()}, cont, "last");
					}));

					//this.uniqueDataReceived.samplingGroups = true;
      	}),
      	lang.hitch(this, function (error) {
					//this.uniqueDataReceived.samplingGroups = true;
					console.log(error);
					alert("Unable to get sampling groups data. Try to reload page. Contact administrator at data@helcom.fi if alert appears again..");
				})
      );

			query.outFields = ["name"];
			raCategoriesQueryTask.execute(query, lang.hitch(this, function (recordSet) {
					var raCategories = {
						identifier: "value",
						label: "label",
						items: []
					};
					array.forEach(recordSet.features, lang.hitch(this, function(feature) {
						if (feature.attributes.name != null) {
							raCategories.items.push({value: feature.attributes.name, label: feature.attributes.name});
						}
					}));

					var raCategoryStore = new ItemFileReadStore({
						data: raCategories
					});

					this.raCategoriesMultiSelect = new CheckedMultiSelect ({
						id:"collectionCodeSearchInput",
						dropDown: false,
						multiple: true,
						store: raCategoryStore,
						style : {width: "100%"},
						onChange: lang.hitch(this, function() {
							this.queryFilters.raCategories = this.raCategoriesMultiSelect.get("value");
						})
					}, raCategoryTp.containerNode);

					//this.uniqueDataReceived.raCategories = true;
      	}),
      	lang.hitch(this, function (error) {
					//this.uniqueDataReceived.raCategories = true;
					console.log(error);
					alert("Unable to get risk assessment categories data. Try to reload page. Contact administrator at data@helcom.fi if alert appears again..");
				})
      );
		},

		getUniqueFiltersForAquaSearch: function() {
			let namesQueryTask = new QueryTask(this.services.unique_names_aquanis);

			let query = new Query();
			query.returnGeometry = false;
			query.where = "1=1";
			query.returnDistinctValues = true;

			query.outFields = ["name"];
			namesQueryTask.execute(query, lang.hitch(this, function (recordSet) {
					let names = [];
					array.forEach(recordSet.features, lang.hitch(this, function(feature) {
						names.push({name: feature.attributes.name, id: feature.attributes.name});
					}));

					let nameStore = new Memory({
						data: names
					});

					let speciesNameSelect = new FilteringSelect({
						id: "speciesNameInputAqua",
						name: "speciesNameAquaSearch",
						class: "searchInput",
						queryExpr: "*${0}*",
						autoComplete: false,
						required: false,
						forceWidth: true,
						hasDownArrow: false,
						placeHolder: "Species name",
						store: nameStore,
						searchAttr: "name",
						onChange: lang.hitch(this, function(value) {
							if (value) {
								this.queryFilters.species_name = value;
								document.getElementById("speciesNameStatusInfoAqua").style.display = "none";
								document.getElementById("speciesAcceptedNameInfoAqua").style.display = "none";
								document.getElementById("speciesNameStatusAqua").innerHTML = "";
								document.getElementById("speciesAcceptedNameAqua").innerHTML = "";
								this.getSpeciesNameStatusAqua(value);
							}
							else {
								this.queryFilters.species_name = null;
							}
						})
					}, dojo.byId("speciesNameInputAqua")).startup();
					//this.uniqueDataReceived.names = true;
      	}),
      	lang.hitch(this, function (error) {
					//this.uniqueDataReceived.names = true;
					console.log(error);
					alert("Unable to get AquaNIS species names data. Try to reload page. Contact administrator at data@helcom.fi if alert appears again..");
				})
      );
		},

		searchInPortsClick: function() {
			this.portTable.resetFilter();
			if (this.setFiltersForResultView()) {
				document.getElementById("searchResultHeader").innerHTML = "Search for species observation locations in ports.";
				document.getElementById("searchPortContainer").style.display = "none";
				domConstruct.empty(dojo.byId("resultsContainer"));
				document.getElementById("portDataGridContainer").style.display = "none";
				document.getElementById("aquaDataGridContainer").style.display = "none";
				document.getElementById("resultInfoContainer").style.display = "block";

				this.countPortObservations();
			}
			else {
				alert("No search filters selected.");
			}
		},

		searchInAquaClick: function() {
			this.aquaTable.resetFilter();
			if (this.setFiltersForResultViewAqua()) {
				document.getElementById("searchResultHeader").innerHTML = "Search for AquaNIS species observation locations.";
				document.getElementById("searchAquaContainer").style.display = "none";
				domConstruct.empty(dojo.byId("resultsContainer"));
				document.getElementById("portDataGridContainer").style.display = "none";
				document.getElementById("aquaDataGridContainer").style.display = "none";
				document.getElementById("resultInfoContainer").style.display = "block";

				this.countAquaObservations();
			}
			else {
				alert("No search filters selected.");
			}
		},

		resetPortFilters: function() {
			this.queryFilters.extent = null;
			this.queryFilters.species_name = null;
			this.queryFilters.ports = null;
			this.queryFilters.samplingGroups = null;
			this.queryFilters.raCategories = null;
			this.queryFilters.year1 = "";
			this.queryFilters.year2 = "";
			this.map.graphics.clear();
			dijit.byId("speciesNameInput").set("value", "");
			this.portsMultiSelect.set("value", []);
			this.portsMultiSelect._updateSelection();
			this.samplingGroupsMultiSelect.set("value", []);
			this.samplingGroupsMultiSelect._updateSelection();
			this.raCategoriesMultiSelect.set("value", []);
			this.raCategoriesMultiSelect._updateSelection();
			dojo.byId("obsYear1Input").value = "";
			dojo.byId("obsYear2Input").value = "";
			document.getElementById("speciesNameStatusInfo").style.display = "none";
			document.getElementById("speciesAcceptedNameInfo").style.display = "none";
			document.getElementById("speciesNameStatus").innerHTML = "";
			document.getElementById("speciesAcceptedName").innerHTML = "";
		},

		resetAquaFilters: function() {
			this.queryFilters.extent = null;
			this.queryFilters.species_name = null;
			this.queryFilters.ports = null;
			this.queryFilters.samplingGroups = null;
			this.queryFilters.raCategories = null;
			this.queryFilters.year1 = "";
			this.queryFilters.year2 = "";
			this.map.graphics.clear();
			dijit.byId("speciesNameInputAqua").set("value", "");
			document.getElementById("speciesNameStatusInfoAqua").style.display = "none";
			document.getElementById("speciesAcceptedNameInfoAqua").style.display = "none";
			document.getElementById("speciesNameStatusAqua").innerHTML = "";
			document.getElementById("speciesAcceptedNameAqua").innerHTML = "";
		},

		clearMap: function() {
			this.layers.observations.graphicsLayer.clear();
			this.map.infoWindow.hide();
		},

		getSpeciesNameStatus: function(name) {
			var url = this.services.getStatus + "&name=" + encodeURIComponent(name);
			var requestHandle = esriRequest({
        url: url,
        handleAs: "json"
      });
			requestHandle.then(lang.hitch(this, function (response) {
				document.getElementById("speciesNameStatusInfo").style.display = "block";
					document.getElementById("speciesNameStatus").innerHTML = response.results[0].value;
					if (response.results[0].value != "accepted") {
						document.getElementById("speciesAcceptedName").innerHTML = response.results[1].value;
						document.getElementById("speciesAcceptedNameInfo").style.display = "block";
					}
      	}),
      	lang.hitch(this, function (error) {
					console.log(error);
				})
      );
		},

		getSpeciesNameStatusAqua: function(name) {
			var url = this.services.getStatus + "&name=" + encodeURIComponent(name);
			var requestHandle = esriRequest({
        url: url,
        handleAs: "json"
      });
			requestHandle.then(lang.hitch(this, function (response) {
				document.getElementById("speciesNameStatusInfoAqua").style.display = "block";
					document.getElementById("speciesNameStatusAqua").innerHTML = response.results[0].value;
					if (response.results[0].value != "accepted") {
						document.getElementById("speciesAcceptedNameAqua").innerHTML = response.results[1].value;
						document.getElementById("speciesAcceptedNameInfoAqua").style.display = "block";
					}
      	}),
      	lang.hitch(this, function (error) {
					console.log(error);
				})
      );
		},

		/*convertCoordinates: function(geometry) {
			var projectionUrl = this.services.projection;
			projectionUrl = projectionUrl + "&inSR=" + geometry.spatialReference.wkid;
			projectionUrl = projectionUrl + "&geometries=" + geometry.xmin + "%2C" + geometry.ymin + "%2C" + geometry.xmax + "%2C" + geometry.ymax;
			var requestHandle = esriRequest({
        url: projectionUrl,
        handleAs: "json"
      });
			requestHandle.then(lang.hitch(this, function (response) {
					this.queryFilters.extent = {
						"xmin": response.geometries[0].x,
						"ymin": response.geometries[0].y,
						"xmax": response.geometries[1].x,
						"ymax": response.geometries[1].y,
						"spatialReference": {"wkid":4326}
					};
      	}),
      	lang.hitch(this, function (error) {
					console.log(error);
				})
      );
		},*/

		createWhereQuery: function() {
			var sql = "";
			// species name
			if ((this.queryFilters.species_name != null) && (this.queryFilters.species_name != "")) {
				sql = sql + "((scientific_name = '" + this.queryFilters.species_name + "') OR (accepted_name = '" + this.queryFilters.species_name + "'))";
			}

			// ports
			if ((this.queryFilters.ports != null) && (this.queryFilters.ports.length > 0)) {
				if (sql.length > 0) {
					sql = sql + " AND ";
				}
				if (this.queryFilters.ports.length > 1) {
					sql = sql + "(";
					array.forEach(this.queryFilters.ports, lang.hitch(this, function(port) {
						sql = sql + "(harbour_name = '" + port + "') OR "
					}));
					sql = sql.slice(0, -4);
					sql = sql + ")";
				}
				else {
					sql = sql + "(harbour_name = '" + this.queryFilters.ports[0] + "')"
				}
			}

			// sampling groups
			if ((this.queryFilters.samplingGroups != null) && (this.queryFilters.samplingGroups.length > 0)) {
				if (sql.length > 0) {
					sql = sql + " AND ";
				}
				if (this.queryFilters.samplingGroups.length > 1) {
					sql = sql + "(";
					array.forEach(this.queryFilters.samplingGroups, lang.hitch(this, function(samplingGroup) {
						sql = sql + "(sampling_group = '" + samplingGroup + "') OR "
					}));
					sql = sql.slice(0, -4);
					sql = sql + ")";
				}
				else {
					sql = sql + "(sampling_group = '" + this.queryFilters.samplingGroups[0] + "')"
				}
			}

			// ra categories
			if ((this.queryFilters.raCategories != null) && (this.queryFilters.raCategories.length > 0)) {
				if (sql.length > 0) {
					sql = sql + " AND ";
				}
				if (this.queryFilters.raCategories.length > 1) {
					sql = sql + "(";
					array.forEach(this.queryFilters.raCategories, lang.hitch(this, function(raCategory) {
						sql = sql + "(ra_category = '" + raCategory + "') OR "
					}));
					sql = sql.slice(0, -4);
					sql = sql + ")";
				}
				else {
					sql = sql + "(ra_category = '" + this.queryFilters.raCategories[0] + "')"
				}
			}

			// year
			if ((this.queryFilters.year1 != "") && (this.queryFilters.year2 != "")) {
				if (this.queryFilters.year1 == this.queryFilters.year2) {
					if (sql.length > 0) {
						sql = sql + " AND ";
					}
					sql = sql + "(year_collected = " + this.queryFilters.year1 + ")"
				}
				else if (this.queryFilters.year1 < this.queryFilters.year2) {
					if (sql.length > 0) {
						sql = sql + " AND ";
					}
					sql = sql + "((year_collected >= " + this.queryFilters.year1 + ") AND (year_collected <= " + this.queryFilters.year2 + "))"
				}
			}

			// greater than
			if ((this.queryFilters.year1 != "") && (this.queryFilters.year2 == "")) {
				if (sql.length > 0) {
					sql = sql + " AND ";
				}
				sql = sql + "(year_collected >= " + this.queryFilters.year1 + ")"
			}

			// lower than
			if ((this.queryFilters.year2 != "") && (this.queryFilters.year1 == "")) {
				if (sql.length > 0) {
					sql = sql + " AND ";
				}
				sql = sql + "(year_collected <= " + this.queryFilters.year2 + ")"
			}
			return sql;
		},

		setFiltersForResultView: function() {
			domConstruct.empty(dojo.byId("resultFilters"));
			var filtersSelected = false;
			var n = domConstruct.create("div", {style: "margin-left: 10px; margin-bottom: 5px;"}, dojo.byId("resultFilters"), "last");
			domConstruct.create("span", {style: "font-size: 14px;", "innerHTML": "Species name: "}, n, "last");
			if ((this.queryFilters.species_name != null) && (this.queryFilters.species_name != "")) {
				domConstruct.create("span", {style: "font-size: 14px; color: #444444; margin-left: 10px;", "innerHTML": this.queryFilters.species_name}, n, "last");
				filtersSelected = true;
			}
			else {
				domConstruct.create("span", {style: "font-size: 14px; color: #444444; margin-left: 10px;", "innerHTML": "ALL"}, n, "last");
			}

			var y1 = domConstruct.create("div", {style: "margin-left: 10px; margin-bottom: 5px;"}, dojo.byId("resultFilters"), "last");
			domConstruct.create("span", {style: "font-size: 14px;", "innerHTML": "Observations year From: "}, y1, "last");
			if ((this.queryFilters.year1 != null) && (this.queryFilters.year1 != "")) {
				domConstruct.create("span", {style: "font-size: 14px; color: #444444; margin-left: 10px;", "innerHTML": this.queryFilters.year1}, y1, "last");
				filtersSelected = true;
			}
			else {
				domConstruct.create("span", {style: "font-size: 14px; color: #444444; margin-left: 10px;", "innerHTML": "-"}, y1, "last");
			}

			var y2 = domConstruct.create("div", {style: "margin-left: 10px; margin-bottom: 5px;"}, dojo.byId("resultFilters"), "last");
			domConstruct.create("span", {style: "font-size: 14px;", "innerHTML": "Observations year To: "}, y2, "last");
			if ((this.queryFilters.year2 != null) && (this.queryFilters.year2 != "")) {
				domConstruct.create("span", {style: "font-size: 14px; color: #444444; margin-left: 10px;", "innerHTML": this.queryFilters.year2}, y2, "last");
				filtersSelected = true;
			}
			else {
				domConstruct.create("span", {style: "font-size: 14px; color: #444444; margin-left: 10px;", "innerHTML": "-"}, y2, "last");
			}

			var p = domConstruct.create("div", {style: "margin-left: 10px; margin-bottom: 5px;"}, dojo.byId("resultFilters"), "last");
			domConstruct.create("span", {style: "font-size: 14px;", "innerHTML": "Ports: "}, p, "last");
			if ((this.queryFilters.ports != null) && (this.queryFilters.ports.length > 0)) {
				domConstruct.create("span", {style: "font-size: 14px; color: #444444; margin-left: 10px;", "innerHTML": this.queryFilters.ports.join("; ")}, p, "last");
				filtersSelected = true;
			}
			else {
				domConstruct.create("span", {style: "font-size: 14px; color: #444444; margin-left: 10px;", "innerHTML": "ALL"}, p, "last");
			}

			var s = domConstruct.create("div", {style: "margin-left: 10px; margin-bottom: 5px;"}, dojo.byId("resultFilters"), "last");
			domConstruct.create("span", {style: "font-size: 14px;", "innerHTML": "Sampling groups: "}, s, "last");
			if ((this.queryFilters.samplingGroups != null) && (this.queryFilters.samplingGroups.length > 0)) {
				domConstruct.create("span", {style: "font-size: 14px; color: #444444; margin-left: 10px;", "innerHTML": this.queryFilters.samplingGroups.join("; ")}, s, "last");
				filtersSelected = true;
			}
			else {
				domConstruct.create("span", {style: "font-size: 14px; color: #444444; margin-left: 10px;", "innerHTML": "ALL"}, s, "last");
			}

			var r = domConstruct.create("div", {style: "margin-left: 10px; margin-bottom: 5px;"}, dojo.byId("resultFilters"), "last");
			domConstruct.create("span", {style: "font-size: 14px;", "innerHTML": "Risk assessment categories: "}, r, "last");
			if ((this.queryFilters.raCategories != null) && (this.queryFilters.raCategories.length > 0)) {
				domConstruct.create("span", {style: "font-size: 14px; color: #444444; margin-left: 10px;", "innerHTML": this.queryFilters.raCategories.join("; ")}, r, "last");
				filtersSelected = true;
			}
			else {
				domConstruct.create("span", {style: "font-size: 14px; color: #444444; margin-left: 10px;", "innerHTML": "ALL"}, r, "last");
			}
			/*if (this.queryFilters.extent != null) {
				var e = this.queryFilters.extent;
				this.resultSection.filter_extent.innerHTML = "South west: " + e.xmin.toFixed(4) + "&deg;, " + e.ymin.toFixed(4) + "&deg; North east: " + e.xmax.toFixed(4) + "&deg;, " + e.ymax.toFixed(4) + "&deg;";
				filtersSelected = true;
			}*/
			return filtersSelected;
		},

		setFiltersForResultViewAqua: function() {
			domConstruct.empty(dojo.byId("resultFilters"));
			let filtersSelected = false;
			let n = domConstruct.create("div", {style: "margin-left: 10px; margin-bottom: 5px;"}, dojo.byId("resultFilters"), "last");
			domConstruct.create("span", {style: "font-size: 14px;", "innerHTML": "Species name: "}, n, "last");
			if ((this.queryFilters.species_name != null) && (this.queryFilters.species_name != "")) {
				domConstruct.create("span", {style: "font-size: 14px; color: #444444; margin-left: 10px;", "innerHTML": this.queryFilters.species_name}, n, "last");
				filtersSelected = true;
			}
			else {
				domConstruct.create("span", {style: "font-size: 14px; color: #444444; margin-left: 10px;", "innerHTML": "ALL"}, n, "last");
			}
			return filtersSelected;
		},

		countPortObservations: function() {
			var queryCount = new Query();
			queryCount.where = this.createWhereQuery();
			/*var extent = this.queryFilters.extent;
			if (extent) {
				queryCount.geometry = new Extent(extent);
			}*/

			var qt = new QueryTask(this.services.observations);

			qt.executeForCount(queryCount, lang.hitch(this, function (count) {
					domConstruct.create("div", {style: "margin-bottom: 10px; font-size: 14px;", innerHTML: "Total observations found:  " +  count}, dojo.byId("resultsContainer"), "last");
					if (count > 0) {
						this.featuresFoundCount = count;
						this.getPortFeatures();
					}
				}),
				lang.hitch(this, function (error) {
					console.log(error);
					alert("Unable to perform port count request. Try to reload page. Contact administrator at data@helcom.fi if alert appears again..");
				})
      );
		},

		countAquaObservations: function() {
			let queryCount = new Query();
			queryCount.where = this.createWhereQuery();

			let qt = new QueryTask(this.services.observations_aquanis);
			qt.executeForCount(queryCount, lang.hitch(this, function (count) {
					domConstruct.create("div", {style: "margin-bottom: 10px; font-size: 14px;", innerHTML: "Total observations found:  " +  count}, dojo.byId("resultsContainer"), "last");
					if (count > 0) {
						this.featuresFoundCount = count;
						this.getAquaFeatures();
					}
				}),
				lang.hitch(this, function (error) {
					console.log(error);
					alert("Unable to perform AquaNIS count request. Try to reload page. Contact administrator at data@helcom.fi if alert appears again..");
				})
      );
		},

		getPortFeatures: function() {
			//var extent = this.queryFilters.extent;
			var query = new Query();
			query.returnGeometry = true;
			//query.outFields = ["*"];
			query.outFields = ["id", "aphia_id", "scientific_name", "taxonomical_status", "accepted_name", "synonyms", "species_url", "species_group", "salinity_min", "salinity_max", "data_source", "origin_of_data_collection", "ra_category", "decimal_latitude", "decimal_longitude", "coordinate_uncertainty", "salinity_obs", "sampling_group", "year_collected", "month_collected", "day_collected", "harbour_name", "harbour_code", "harbour_location", "field_number", "subunit", "restriction_yes_no", "restriction_description", "information_withheld", "data_generalization", "upload_date", "notes", "citation"];
			query.outSpatialReference = this.map.spatialReference;
			query.where = this.createWhereQuery();
			/*if (extent) {
				query.geometry = new Extent(extent);
			}*/

			var qt = new QueryTask(this.services.observations);

			qt.execute(query, lang.hitch(this, function (featureSet) {
					this.clearMap();
					this.layers.observations.graphicsLayer.setVisibility(true);
					if (featureSet.features.length > 0) {
						var infoWindowContent = "<table>";
						array.forEach(featureSet.fields, lang.hitch(this, function(field) {
							if (this.obsFields[field.name]) {
								if (this.obsFields[field.name].type) {
									if (this.obsFields[field.name].type == "date") {
										infoWindowContent = infoWindowContent + "<tr><td>" + this.obsFields[field.name].alias + "</td><td>${" + field.name + ":DateString(local: false, hideTime: true)}</td></tr>";
									}
									else if (this.obsFields[field.name].type == "url") {
										infoWindowContent = infoWindowContent + "<tr><td>" + this.obsFields[field.name].alias + "</td><td><a href='${" + field.name + "}' target='_blank'>${" + field.name + "}</td></tr>";
									}
									else if (this.obsFields[field.name].type == "semicolon") {
										infoWindowContent = infoWindowContent + "<tr><td>" + this.obsFields[field.name].alias + "</td><td>${" + field.name + "}</td></tr>";
									}
								}
								else {
									infoWindowContent = infoWindowContent + "<tr><td>" + this.obsFields[field.name] + "</td><td>${" + field.name + "}</td></tr>";
								}
							}
						}));
						infoWindowContent +="</table>";
						this.layers.observations.infoTemplate.setContent(infoWindowContent);
						this.map.setExtent(graphicsUtils.graphicsExtent(featureSet.features), true);

						let gridObservations = [];
						array.forEach(featureSet.features, lang.hitch(this, function(feature) {
							feature.setSymbol(this.layers.observations.symbol);
							this.layers.observations.graphicsLayer.add(feature);
							gridObservations.push(feature.attributes);
						}));
						document.getElementById("portDataGridContainer").style.display = "block";
						this.portTable.setGridData(gridObservations);

						let layerSwitcher = domConstruct.create("div", {"style": "margin-top: 5px;"}, dojo.byId("resultsContainer"), "last");
						let layerCheckbox = new CheckBox({checked: true});
						layerCheckbox.placeAt(layerSwitcher, "first");
						on(layerCheckbox, "change", lang.hitch(this, function(checked) {
							if (checked) {
								this.layers.observations.graphicsLayer.setVisibility(true);
							}
							else {
								this.layers.observations.graphicsLayer.setVisibility(false);
								this.map.infoWindow.hide();
							}
						}));
						domConstruct.create("span", {"style": "color: #444444; font-size: 14px;", "innerHTML": "Show on the map"}, layerSwitcher, "last");
						if (featureSet.features.length == 10000) {
							domConstruct.create("div", {"style": "color: #444444; font-size: 12px; margin-left: 20px;", "innerHTML": "10000 observations available for preview."}, layerSwitcher, "last");
						}

						let layerDownloadButton = domConstruct.create("div", {"class": "downloadButton", "style": "margin-top: 5px;", "innerHTML": "Download Shapefile"}, dojo.byId("resultsContainer"), "last");
						let downloadMaxMessage = domConstruct.create("div", {"style": "display: none; color: #444444; font-size: 12px; margin-left: 20px;", "innerHTML": "Search result dataset is too big to be extracted for download. Please, update your search in order to get downloadable dataset (&lt;100 000 observations) or alternatively download the whole observations dataset as <a href='data/observations_gdb.zip'>ESRI Geodatabase (ZIP)</a>."}, dojo.byId("resultsContainer"), "last");
						on(layerDownloadButton, "click", lang.hitch(this, function() {
							if (this.featuresFoundCount > 100000) {
								downloadMaxMessage.style.display = "block";
							}
							else {
								this.downloadShapeFile(this.viewMode);
							}
						}));
					}
      	}),
      	lang.hitch(this, function (error) {
					console.log(error);
					alert("Unable to load port observations data. Try to reload page. Contact administrator at data@helcom.fi if alert appears again..");
				})
      );
		},

		getAquaFeatures: function() {
			let query = new Query();
			query.returnGeometry = true;
			//query.outFields = ["*"];
			query.outFields = ["id", "aphia_id", "scientific_name", "taxonomical_status", "accepted_name", "synonyms", "species_url", "salinity_min", "salinity_max", "data_source", "origin_of_data_collection", "decimal_latitude", "decimal_longitude", "year_collected", "restriction_yes_no", "information_withheld", "data_generalization", "upload_date", "citation"];
			query.outSpatialReference = this.map.spatialReference;
			query.where = this.createWhereQuery();

			let qt = new QueryTask(this.services.observations_aquanis);
			qt.execute(query, lang.hitch(this, function (featureSet) {
					this.clearMap();
					this.layers.observations.graphicsLayer.setVisibility(true);
					if (featureSet.features.length > 0) {
						//document.getElementById("resultGridContainer").style.display = "block";
						var infoWindowContent = "<table>";
						array.forEach(featureSet.fields, lang.hitch(this, function(field) {
							if (this.obsFields[field.name]) {
								if (this.obsFields[field.name].type) {
									if (this.obsFields[field.name].type == "date") {
										infoWindowContent = infoWindowContent + "<tr><td>" + this.obsFields[field.name].alias + "</td><td>${" + field.name + ":DateString(local: false, hideTime: true)}</td></tr>";
									}
									else if (this.obsFields[field.name].type == "url") {
										infoWindowContent = infoWindowContent + "<tr><td>" + this.obsFields[field.name].alias + "</td><td><a href='${" + field.name + "}' target='_blank'>${" + field.name + "}</td></tr>";
									}
									else if (this.obsFields[field.name].type == "semicolon") {
										infoWindowContent = infoWindowContent + "<tr><td>" + this.obsFields[field.name].alias + "</td><td>${" + field.name + "}</td></tr>";
									}
								}
								else {
									infoWindowContent = infoWindowContent + "<tr><td>" + this.obsFields[field.name] + "</td><td>${" + field.name + "}</td></tr>";
								}
							}
						}));
						infoWindowContent +="</table>";
						this.layers.observations.infoTemplate.setContent(infoWindowContent);
						this.map.setExtent(graphicsUtils.graphicsExtent(featureSet.features), true);

						let gridObservations = [];
						array.forEach(featureSet.features, lang.hitch(this, function(feature) {
							feature.setSymbol(this.layers.observations.symbol);
							this.layers.observations.graphicsLayer.add(feature);
							gridObservations.push(feature.attributes);
						}));
						document.getElementById("aquaDataGridContainer").style.display = "block";
						this.aquaTable.setGridData(gridObservations);

						/*array.forEach(featureSet.features, lang.hitch(this, function(feature) {
							feature.setSymbol(this.layers.observations.symbol);
							this.layers.observations.graphicsLayer.add(feature);
							//gridObservations.push(feature.attributes);
						}));*/

						/*var i, len;
						for (i=0, len = gridObservations.length; i < len; ++i) {
			    		gridData.items.push(dojo.mixin({'id': i + 1 }, gridObservations[i % len]));
						}
						this.resultGridStore = new ItemFileWriteStore({data: gridData});

						this.resultGrid.setStore(this.resultGridStore);*/

						let layerSwitcher = domConstruct.create("div", {"style": "margin-top: 5px;"}, dojo.byId("resultsContainer"), "last");
						let layerCheckbox = new CheckBox({checked: true});
						layerCheckbox.placeAt(layerSwitcher, "first");
						on(layerCheckbox, "change", lang.hitch(this, function(checked) {
							if (checked) {
								this.layers.observations.graphicsLayer.setVisibility(true);
							}
							else {
								this.layers.observations.graphicsLayer.setVisibility(false);
								this.map.infoWindow.hide();
							}
						}));
						domConstruct.create("span", {"style": "color: #444444; font-size: 14px;", "innerHTML": "Show on the map"}, layerSwitcher, "last");
						if (featureSet.features.length == 10000) {
							domConstruct.create("div", {"style": "color: #444444; font-size: 12px; margin-left: 20px;", "innerHTML": "10000 observations available for preview."}, layerSwitcher, "last");
						}

						let layerDownloadButton = domConstruct.create("div", {"class": "downloadButton", "style": "margin-top: 5px;", "innerHTML": "Download Shapefile"}, dojo.byId("resultsContainer"), "last");
						let downloadMaxMessage = domConstruct.create("div", {"style": "display: none; color: #444444; font-size: 12px; margin-left: 20px;", "innerHTML": "Search result dataset is too big to be extracted for download. Please, update your search in order to get downloadable dataset (&lt;100 000 observations) or alternatively download the whole observations dataset as <a href='data/observations_gdb.zip'>ESRI Geodatabase (ZIP)</a>."}, dojo.byId("resultsContainer"), "last");
						on(layerDownloadButton, "click", lang.hitch(this, function() {
							if (this.featuresFoundCount > 100000) {
								downloadMaxMessage.style.display = "block";
							}
							else {
								this.downloadShapeFile(this.viewMode);
							}
						}));
					}
      	}),
      	lang.hitch(this, function (error) {
					console.log(error);
					alert("Unable to load AquaNIS observations data. Try to reload page. Contact administrator at data@helcom.fi if alert appears again..");
				})
      );
		},

		downloadShapeFile: function(layer) {
			document.getElementById("loadingCover").style.display = "block";
			let url = this.services.downloadShp;
			url = url + "&layer=" + encodeURIComponent(layer);
			if ((this.queryFilters.species_name != null) && (this.queryFilters.species_name != "")) {
				url = url + "&name=" + encodeURIComponent(this.queryFilters.species_name);
			}
			if ((this.queryFilters.ports != null) && (this.queryFilters.ports.length > 0)) {
				url = url + "&port=" + encodeURIComponent(this.queryFilters.ports.join(";"));
			}
			if ((this.queryFilters.samplingGroups != null) && (this.queryFilters.samplingGroups.length > 0)) {
				url = url + "&sampling_group=" + encodeURIComponent(this.queryFilters.samplingGroups.join(";"));
			}
			if ((this.queryFilters.raCategories != null) && (this.queryFilters.raCategories.length > 0)) {
				url = url + "&ra_category=" + encodeURIComponent(this.queryFilters.raCategories.join(";"));
			}
			if ((this.queryFilters.year1 != null) && (this.queryFilters.year1.length != "")) {
				url = url + "&year1=" + encodeURIComponent(this.queryFilters.year1);
			}
			if ((this.queryFilters.year2 != null) && (this.queryFilters.year2.length != "")) {
				url = url + "&year2=" + encodeURIComponent(this.queryFilters.year2);
			}
			/*if (this.queryFilters.extent != null) {
				url = url + "&xmin=" + encodeURIComponent(this.queryFilters.extent.xmin) + "&ymin=" + encodeURIComponent(this.queryFilters.extent.ymin) + "&xmax=" + encodeURIComponent(this.queryFilters.extent.xmax) + "&ymax=" + encodeURIComponent(this.queryFilters.extent.ymax);
			}*/
			let downloadRequestHandle = esriRequest({
				url: url,
				handleAs: "json"
			});
			downloadRequestHandle.then(lang.hitch(this, function (response) {
					if ((response.results[0].paramName == "shapefile") && (response.results[0].value)) {
						window.location = response.results[0].value.url;
					}
					else {
						alert("Unable to perform download request. Try to reload page. Contact administrator at data@helcom.fi if alert appears again..");
					}
					document.getElementById("loadingCover").style.display = "none";
				}),
				lang.hitch(this, function (error) {
					document.getElementById("loadingCover").style.display = "none";
					console.log(error);
					alert("Unable to perform download request. Try to reload page. Contact administrator at data@helcom.fi if alert appears again..");
				})
			);
		}
	});
});
