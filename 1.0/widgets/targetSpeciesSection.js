define([
	"dojo/_base/declare", "dojo/_base/lang", "dojo", "dojo/on",	"dojo/dom", "dojo/dom-style",
	"dojo/_base/array", "dojo/dom-construct",
	"dijit/Dialog",
	"esri/tasks/query", "esri/tasks/QueryTask",
	"widgets/dataTable"
], function(
	declare, lang, dojo, on, dom, domStyle,
	array, domConstruct,
	Dialog,
	Query, QueryTask,
	dataTable
){
	return declare(null, {
		targetSpeciesService: null,
		speciesService: null,
		speciesFields: null,
		tsTable: null,
		dataPopup: null,

		constructor: function(params) {
			this.targetSpeciesService = params.targetSpeciesService;
			this.speciesService = params.speciesService;
			this.dataPopup = params.dataPopup;
			this.speciesFields = params.speciesFields;
			this.postCreate();
		},

		postCreate: function() {
			this.createTargetSpeciesTable();
			this.getTargetSpecies();

			on(this.tsTable.grid,"CellClick", lang.hitch(this, function(evt) {
				if (evt.cell.field == "species_name") {
					this.getSpeciesInfo(this.tsTable.grid.selection.getSelected()[0].species_id[0]);
				}
			}));
		},

		createTargetSpeciesTable: function() {
			let tsTableLayout = [
				{
					noscroll: true,
					cells: [
						{ field: "species_name", name: "Species name", datatype: "string", width: "200px", formatter: this.createLink}
          ]
				},
				{
					cells: [
						{ field: "ra_category", name: "Category", datatype: "string", width: "100px"},
						{ field: "salinity_min", name: "Salinity min", datatype: "number", width: "70px"},
			    	{ field: "salinity_max", name: "Salinity max", datatype: "number", width: "70px"},
			    	{ field: "health_impact", name: "Health impact", datatype: "string", width: "auto"},
			    	{ field: "health_impact_source", name: "Health impact source", datatype: "string", width: "auto", formatter: this.linkify},
			    	{ field: "environmental_impact", name: "Environmental impact", datatype: "string", width: "auto"},
			    	{ field: "environmental_impact_source", name: "Environmental impact source", datatype: "string", width: "auto", formatter: this.linkify},
						{ field: "economic_impact", name: "Economic impact", datatype: "string", width: "auto"},
			    	{ field: "economic_impact_source", name: "Economic impact source", datatype: "string", width: "auto", formatter: this.linkify}
					]
				}
			];

			let uniqueValues = {
				"ra_category": [],
				"salinity_min": [],
				"salinity_max": []
			};
			let searchFields = ["species_name", "health_impact", "health_impact_source", "environmental_impact", "environmental_impact_source", "economic_impact", "economic_impact_source"];
			let singleListFields = ["ra_category", "salinity_min", "salinity_max"];
			let complexListFields = [];
			let numberFields = [];

			if (!this.tsTable) {
				this.tsTable = new dataTable({
					divId: "targetSpeciesDataGrid",
					uniqueValues: uniqueValues,
					searchFields: searchFields,
					singleListFields: singleListFields,
					complexListFields: complexListFields,
					numberFields: numberFields,
				});
			}
			this.tsTable.changeLayout(tsTableLayout);
		},

		getTargetSpecies: function(id) {
			var qt = new QueryTask(this.targetSpeciesService);
			var query = new Query();
			query.returnGeometry = false;
			query.outFields = ["*"];
			query.where = "1=1";

			var speciesData = {
	    	identifier: 'id',
	    	label: 'id',
	    	items: []
			};

			document.getElementById("loadingCover").style.display = "block";
			qt.execute(query, lang.hitch(this, function (recordSet) {
					let species = [];
					array.forEach(recordSet.features, lang.hitch(this, function(feature) {
						if (feature.attributes.ra_category != "Watch") {
							species.push(feature.attributes);
						}
						else {
							let rec = feature.attributes.species_name
							if ((feature.attributes.salinity_min != null) && (feature.attributes.salinity_max != null)) {
								rec += " (Salinity min - max range: " + feature.attributes.salinity_min + " - " + feature.attributes.salinity_max + ")"
							}
							let w = domConstruct.create("div", {class: "leftPanelLink", innerHTML: rec}, dojo.byId("watchlist"), "last");
							on(w, "click", lang.hitch(this, function() {
								this.getSpeciesInfo(feature.attributes.species_id);
							}));
						}
					}));
					this.tsTable.setGridData(species);
					document.getElementById("loadingCover").style.display = "none";
      	}),
      	lang.hitch(this, function (error) {
					document.getElementById("loadingCover").style.display = "none";
					console.log(error);
					alert("Unable to get target species data. Try to reload page. Contact administrator at data@helcom.fi if alert appears again..");
				})
      );
		},

		getSpeciesInfo: function(id) {
			var qt = new QueryTask(this.speciesService);
			var query = new Query();
			query.returnGeometry = false;
			query.outFields = ["*"];
			query.where = "id = " + id;

			document.getElementById("loadingCover").style.display = "block";
			qt.execute(query, lang.hitch(this, function (recordSet) {
					let data = recordSet.features[0].attributes;
					let title = "Species information";
					if (data.scientific_name) {
						title = data.scientific_name + " - species information";
					}
					this.dataPopup.showPopup(title, this.speciesFields, data);
					document.getElementById("loadingCover").style.display = "none";
      	}),
      	lang.hitch(this, function (error) {
					document.getElementById("loadingCover").style.display = "none";
					console.log(error);
					alert("Unable to get species data. Try to reload page. Contact administrator at data@helcom.fi if alert appears again..");
				})
      );
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
		}
	});
});
