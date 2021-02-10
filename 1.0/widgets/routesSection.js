define([
	"dojo/_base/declare",
	"dojo/dom-construct",
	"dojo/_base/lang", "dojo/_base/array", "dojo/on",
	"dijit/form/Select", "dojo/data/ObjectStore", "dojo/store/Memory", "dijit/Dialog",
	"esri/tasks/query", "esri/tasks/QueryTask", "esri/request",
	"esri/graphicsUtils"
], function(
	declare,
	domConstruct,
	lang, array, on,
	Select, ObjectStore, Memory, Dialog,
	Query, QueryTask, esriRequest,
	graphicsUtils
){
	return declare(null, {
		map: null,
		layers: null,
		dataPopup: null,
		speciesFields: null,
		portFields: null,
		requestsReceived: {
			"start": false,
			"end": false
		},
		portsPointsService: null,
		obsPointsService: null,
		speciesService: null,
		pdfService: null,
		checkSamplingService: null,
		startPortSelect: null,
		endPortSelect: null,
		startPortName: null,
		endPortName: null,
		startPortMinSalinity: null,
		startPortMaxSalinity: null,
		endPortMinSalinity: null,
		endPortMaxSalinity: null,
		startPortSpecies: [],
		endPortSpecies: [],
		startPortCategory: null,
		endPortCategory: null,
		ports: null,
		popupDialog: null,
		pdfParams: {
			"risk": null,
			"donorPort": null,
			"donorPortArea": null,
			"donorPortSalMin": null,
			"donorPortSalMax": null,
			"recipientPort": null,
			"recipientPortArea": null,
			"recipientPortSalMin": null,
			"recipientPortSalMax": null,
			"species": "",
			"donorYearNote": "",
			"recipientYearNote": "",
			"donorSamplingNote": "",
			"recipientSamplingNote": ""
		},
		samplingGroups: null,

		constructor: function(params) {
			this.obsPointsService = params.obsPointsService;
			this.portsPointsService = params.portsPointsService;
			this.speciesService = params.speciesService;
			this.pdfService = params.pdfService;
			this.checkSamplingService = params.checkSamplingService;
			this.map = params.map;
			this.layers = params.layers;
			this.dataPopup = params.dataPopup;
			this.samplingGroups = params.samplingGroups;
			this.speciesFields = params.speciesFields;
			this.portFields = params.portFields;
			this.postCreate();
		},

		postCreate: function() {

			this.startPortSelect = new Select({
				id: "startPortSelect",
				class: "selectPort"
			});
			this.startPortSelect.placeAt(dojo.byId("startPortSelectContainer"));
			this.startPortSelect.startup();

			this.endPortSelect = new Select({
				id: "endPortSelect",
				class: "selectPort"
			});
			this.endPortSelect.placeAt(dojo.byId("endPortSelectContainer"));
			this.endPortSelect.startup();

			this.popupDialog = new Dialog({
				style: "max-width: 400px;"
			});

			this.setupPortsLists();
			this.displayPorts();

			on(this.startPortSelect, "change", lang.hitch(this, function(val) {
				this.layers.startPortHighlight.graphicsLayer.clear();
				this.getSelectedPorts("start", val);
			}));

			on(this.endPortSelect, "change", lang.hitch(this, function(val) {
				this.layers.endPortHighlight.graphicsLayer.clear();
				this.getSelectedPorts("end", val);
			}));

			on(dojo.byId("startAlgorithm"), "click", lang.hitch(this, function() {
				this.clean();
				if ((this.startPortSelect.value == "Null") || (this.endPortSelect.value == "Null")) {
					document.getElementById("notSelectedPortsMessage").style.display = "block";
				}
				else if (this.startPortSelect.value == this.endPortSelect.value) {
					document.getElementById("similarPortsMessage").style.display = "block";
				}
				else {
					document.getElementById("downloadPDF").style.display = "block";
					this.startPortName = this.startPortSelect.focusNode.textContent;
					this.endPortName = this.endPortSelect.focusNode.textContent;
					this.pdfParams.donorPort = this.startPortName;
					this.pdfParams.recipientPort = this.endPortName;
					this.getPortSalinities("start", this.startPortSelect.value);
					this.getPortSalinities("end", this.endPortSelect.value);
					this.checkSampling("start", this.startPortName);
					this.checkSampling("end", this.endPortName);
				}
			}));

			on(dojo.byId("downloadPDF"), "click", lang.hitch(this, function() {
				this.downloadPDFReport();
			}));
		},

		clean: function() {
			this.startPortName = null;
			this.endPortName = null;
			this.startPortMinSalinity = null;
			this.startPortMaxSalinity = null;
			this.endPortMinSalinity = null;
			this.endPortMaxSalinity = null;
			this.startPortSpecies = [];
			this.endPortSpecies = [];
			this.startPortCategory = null;
			this.endPortCategory = null;
			this.pdfParams.risk = null;
			this.pdfParams.donorPort = null;
			this.pdfParams.donorPortArea = null;
			this.pdfParams.donorPortSalMin = null;
			this.pdfParams.donorPortSalMax = null;
			this.pdfParams.recipientPort = null;
			this.pdfParams.recipientPortArea = null;
			this.pdfParams.recipientPortSalMin = null;
			this.pdfParams.recipientPortSalMax = null;
			this.pdfParams.species = "";
			this.pdfParams.donorYearNote = "";
			this.pdfParams.recipientYearNote = "";
			this.pdfParams.donorSamplingNote = "";
			this.pdfParams.recipientSamplingNote = "";
			document.getElementById("notSelectedPortsMessage").style.display = "none";
			document.getElementById("similarPortsMessage").style.display = "none";
			document.getElementById("riskInfoContainer").style.display = "none";
			document.getElementById("yearNoteStart").style.display = "none";
			document.getElementById("yearNoteEnd").style.display = "none";
			document.getElementById("samplingNoteStart").style.display = "none";
			document.getElementById("samplingNoteEnd").style.display = "none";
			document.getElementById("riskSpeciesContainer").style.display = "none";
			document.getElementById("diagramHighRisk").style.display = "none";
			document.getElementById("diagramLowRiskSalinity").style.display = "none";
			document.getElementById("diagramLowRiskTS").style.display = "none";
			domConstruct.empty(dojo.byId("riskSpeciesContainer"));
			document.getElementById("downloadPDF").style.display = "none";
			document.getElementById("downloadPDFNote").style.display = "none";
		},

		displayPorts: function() {
			let qt = new QueryTask(this.portsPointsService);
			let query = new Query();
			query.returnGeometry = true;
			query.outFields = ["*"];
			query.where = "harbour_code is not null";

			qt.execute(query, lang.hitch(this, function (featureSet) {
					this.layers.ports.graphicsLayer.clear();
					this.ports = featureSet.features;
					if (featureSet.features.length > 0) {

						let infoWindowContent = "<table>";
						array.forEach(featureSet.fields, lang.hitch(this, function(field) {
							if ((field.name != "OBJECTID") && (field.name != "id")) {
								infoWindowContent = infoWindowContent + "<tr><td>" + this.portFields[field.name] + "</td><td>${" + field.name + "}</td></tr>";
							}
						}));
						this.layers.ports.infoTemplate.setContent(infoWindowContent);

						this.map.setExtent(graphicsUtils.graphicsExtent(featureSet.features), true);

						array.forEach(featureSet.features, lang.hitch(this, function(graphic) {
							graphic.setSymbol(this.layers.ports.symbol);
							this.layers.ports.graphicsLayer.add(graphic);
						}));
					}
      	}),
      	lang.hitch(this, function (error) {
					console.log(error);
					alert("Unable to get ports data. Try to reload page. Contact administrator at data@helcom.fi if alert appears again..");
				})
      );
		},

		zoomToPorts: function() {
			this.map.setExtent(graphicsUtils.graphicsExtent(this.ports), true);
		},

		setupPortsLists: function() {
			let qt = new QueryTask(this.portsPointsService);
			let query = new Query();
			query.returnGeometry = false;
			query.outFields = ["harbour_code", "harbour_name"];
			query.returnDistinctValues = true;
			query.orderByFields = ["harbour_name"];
			query.where = "harbour_code is not null";

			qt.execute(query, lang.hitch(this, function (recordSet) {
					let store = new Memory({
						data: [{id: "Null", label: "-- Select a port"}]
					});
					array.forEach(recordSet.features, lang.hitch(this, function(feature) {
						store.data.push({id: feature.attributes.harbour_code, label:  feature.attributes.harbour_name + " (" + feature.attributes.harbour_code + ")"});
						//store.data.push({id: feature.attributes.harbour_name + " (" + feature.attributes.harbour_code + ")", label:  feature.attributes.harbour_name + " (" + feature.attributes.harbour_code + ")"});
					}));
					let os = new ObjectStore({objectStore: store});
					this.startPortSelect.setStore(os);
					this.endPortSelect.setStore(os);
      	}),
      	lang.hitch(this, function (error) {
					console.log(error);
					alert("Unable to get ports information. Try to reload page. Contact administrator at data@helcom.fi if alert appears again..");
				})
      );
		},

		getSelectedPorts: function(type, code) {
			let qt = new QueryTask(this.portsPointsService);
			let query = new Query();
			query.returnGeometry = true;
			query.outFields = ["harbour_code"];
			query.where = "harbour_code = '" + code + "'";

			qt.execute(query, lang.hitch(this, function (featureSet) {
					array.forEach(featureSet.features, lang.hitch(this, function(graphic) {
						if (type == "start") {
							graphic.setSymbol(this.layers.startPortHighlight.symbol);
							this.layers.startPortHighlight.graphicsLayer.add(graphic);
						}
						else if (type == "end") {
							graphic.setSymbol(this.layers.endPortHighlight.symbol);
							this.layers.endPortHighlight.graphicsLayer.add(graphic);
						}
					}));
      	}),
      	lang.hitch(this, function (error) {
					console.log(error);
					alert("Unable to get selected ports data. Try to reload page. Contact administrator at data@helcom.fi if alert appears again..");
				})
      );
		},

		checkSampling: function(type, port) {
			let portName = port.split(' (')[0]
			let url = this.checkSamplingService;
			url = url + "&Port=" + encodeURIComponent(portName);
			url = url + "&Groups=" + encodeURIComponent(this.samplingGroups.join(";"));
			let requestHandle = esriRequest({
				url: url,
				handleAs: "json"
			});
			requestHandle.then(lang.hitch(this, function (response) {
					if ((response.results[0].paramName == "Result") && (response.results[0].value == 0)) {
						let samplingNote = "";
						if (type == "start") {
							samplingNote = "Important! " + this.startPortName + " survey did not fulfil all the sampling requirements according to the JHP Port survey protocol.";
							document.getElementById("samplingNoteStart").innerHTML = samplingNote;
							document.getElementById("samplingNoteStart").style.display = "block";
							this.pdfParams.donorSamplingNote = samplingNote;
						}
						if (type == "end") {
							samplingNote = "Important! " + this.endPortName + " survey did not fulfil all the sampling requirements according to the JHP Port survey protocol.";
							document.getElementById("samplingNoteEnd").innerHTML = samplingNote;
							document.getElementById("samplingNoteEnd").style.display = "block";
							this.pdfParams.recipientSamplingNote = samplingNote;
						}
					}
				}),
				lang.hitch(this, function (error) {
					console.log(error);
					alert("Unable to perform check sampling request. Try to reload page. Contact administrator at data@helcom.fi if alert appears again..");
				})
			);
		},

		getPortSalinities: function(type, code) {
			let qt = new QueryTask(this.portsPointsService);
			let query = new Query();
			query.returnGeometry = false;
			query.outFields = ["salinity_port_min", "salinity_port_max", "ra_target"];
			query.where = "harbour_code = '"+ code + "'";

			qt.execute(query, lang.hitch(this, function (recordSet) {
					let minSal = [], maxSal = [], category = null;
					array.forEach(recordSet.features, lang.hitch(this, function(feature) {
						minSal.push(feature.attributes.salinity_port_min);
						maxSal.push(feature.attributes.salinity_port_max);
						category = feature.attributes.ra_target;
					}));

					if (type == "start") {
						this.startPortMinSalinity = Math.min(...minSal);
						this.startPortMaxSalinity = Math.max(...maxSal);
						this.startPortCategory = category;
						this.pdfParams.donorPortSalMin = this.startPortMinSalinity;
						this.pdfParams.donorPortSalMax = this.startPortMaxSalinity;
						this.pdfParams.donorPortArea = this.startPortCategory.replace('Target ','');
						this.requestsReceived.start = true;
						if (this.requestsReceived.end) {
							this.checkPortsSalinity();
						}
					}
					else if (type == "end") {
						this.endPortMinSalinity = Math.min(...minSal);
						this.endPortMaxSalinity = Math.max(...maxSal);
						this.endPortCategory = category;
						this.pdfParams.recipientPortSalMin = this.endPortMinSalinity;
						this.pdfParams.recipientPortSalMax = this.endPortMaxSalinity;
						this.pdfParams.recipientPortArea = this.endPortCategory.replace('Target ','');;
						this.requestsReceived.end = true;
						if (this.requestsReceived.start) {
							this.checkPortsSalinity();
						}
					}
      	}),
      	lang.hitch(this, function (error) {
					console.log(error);
					alert("Unable to get ports salinity data. Try to reload page. Contact administrator at data@helcom.fi if alert appears again..");
				})
      );
		},

		checkPortsSalinity: function() {
			this.requestsReceived.start = false;
			this.requestsReceived.end = false;
			document.getElementById("travelingMessage").innerHTML = "Risk assessment calculation for route from " + this.startPortCategory.replace('Target ','') + " area, port " + this.startPortName +  " to " + this.endPortCategory.replace('Target ','') + " area, port " + this.endPortName + ".";
			if (((this.startPortMaxSalinity < 0.5) && (this.endPortMinSalinity > 30)) || ((this.startPortMinSalinity > 30) && (this.endPortMaxSalinity < 0.5))) {
				document.getElementById("riskMessage").style.color = "green";
				document.getElementById("riskMessage").innerHTML = "Low risk";
				document.getElementById("riskInfoContainer").style.display = "block";
				document.getElementById("salinityMessage").innerHTML = "1) Donor port " + this.startPortName + "minimum salinity - " + this.startPortMinSalinity + " PSU, maximum salinity - " + this.startPortMaxSalinity + " PSU. Recipient port " + this.endPortName + "minimum salinity - " + this.endPortMinSalinity + " PSU, maximum salinity - " + this.endPortMaxSalinity + " PSU.";
				document.getElementById("diagramLowRiskSalinity").style.display = "inline";
				this.pdfParams.risk = "low_sal";
				this.pdfParams.species = "none";
			}
			else {
				//let y = new Date().getFullYear() - 5;
				//this.getObservedSpecies5Years("start", this.startPortSelect.value, this.endPortCategory, y);
				//this.getObservedSpecies5Years("end", this.endPortSelect.value, this.endPortCategory, y);
				this.countObservedSpecies("start", this.startPortSelect.value, this.endPortCategory);
				this.countObservedSpecies("end", this.endPortSelect.value, this.endPortCategory);
			}
		},

		countObservedSpecies: function(type, code, category) {
			let query = new Query();
			let where = "harbour_code = '"+ code + "' and ";
			if (category == "Target Joint") {
				where = where + "((ra_category = 'Target HELCOM') or (ra_category = 'Target OSPAR') or (ra_category = 'Target Joint'))";
			}
			else {
				where = where + "((ra_category = '" + category + "') or (ra_category = 'Target Joint'))";
			}
			query.where = where;
			var qt = new QueryTask(this.obsPointsService);

			qt.executeForCount(query, lang.hitch(this, function (count) {
					if (count == 0) {
						this.getObservedSpecies(type, category, where);
					}
					else {
						let y = new Date().getFullYear() - 5;
						this.getObservedSpecies5Years(type, category, where, y);
					}
				}),
				lang.hitch(this, function (error) {
					console.log(error);
					alert("Unable to count port species data. Try to reload page. Contact administrator at data@helcom.fi if alert appears again..");
				})
      );
		},

		getObservedSpecies5Years: function(type, category, where, year) {
			let qt = new QueryTask(this.obsPointsService);
			let query = new Query();
			query.returnGeometry = false;
			query.returnDistinctValues = true;
			query.outFields = ["species_id"];
			let whereYear = where + " and year_collected >= " + year;
			query.where = whereYear;
			qt.execute(query, lang.hitch(this, function (recordSet) {
					if (recordSet.features.length > 0) {
						this.getObservedSpecies(type, category, whereYear);
					}
					else {
						this.getObservedSpecies(type, category, where);
						let yearNote = "";
						if (type == "start") {
							yearNote = "Important! " + this.startPortName + " port species used for risk assessment calculation were observed more than 5 years ago.";
							document.getElementById("yearNoteStart").innerHTML = yearNote;
							document.getElementById("yearNoteStart").style.display = "block";
							this.pdfParams.donorYearNote = yearNote;
						}
						if (type == "end") {
							yearNote = "Important! " + this.endPortName + " port species used for risk assessment calculation were observed more than 5 years ago.";
							document.getElementById("yearNoteEnd").innerHTML = yearNote;
							document.getElementById("yearNoteEnd").style.display = "block";
							this.pdfParams.recipientYearNote = yearNote;
						}
					}
      	}),
      	lang.hitch(this, function (error) {
					console.log(error);
					alert("Unable to get ports species data. Try to reload page. Contact administrator at data@helcom.fi if alert appears again..");
				})
      );
		},

		getObservedSpecies: function(type, category, where) {
			let qt = new QueryTask(this.obsPointsService);
			let query = new Query();
			query.returnGeometry = false;
			query.returnDistinctValues = true;
			query.outFields = ["scientific_name", "taxonomical_status", "accepted_name", "species_id"];
			query.where = where;

			qt.execute(query, lang.hitch(this, function (recordSet) {
					array.forEach(recordSet.features, lang.hitch(this, function(feature) {
						if (type == "start") {
							this.startPortSpecies.push(feature.attributes);
						}
						else if (type == "end") {
							this.endPortSpecies.push(feature.attributes.species_id);
						}
					}));

					if (type == "start") {
						this.requestsReceived.start = true;
						if (this.requestsReceived.end) {
							this.checkRiskSpecies(category);
						}
					}
					else if (type == "end") {
						this.requestsReceived.end = true;
						if (this.requestsReceived.start) {
							this.checkRiskSpecies(category);
						}
					}
      	}),
      	lang.hitch(this, function (error) {
					console.log(error);
					alert("Unable to get ports species data. Try to reload page. Contact administrator at data@helcom.fi if alert appears again..");
				})
      );
		},

		checkRiskSpecies: function() {
			this.requestsReceived.start = false;
			this.requestsReceived.end = false;

			let riskSpecies = [];
			array.forEach(this.startPortSpecies, lang.hitch(this, function(species) {
				if (!this.endPortSpecies.includes(species.species_id)) {
					riskSpecies.push(species);
				}
			}));

			document.getElementById("riskInfoContainer").style.display = "block";
			document.getElementById("salinityMessage").innerHTML = "1) Donor port " + this.startPortName + " minimum salinity - " + this.startPortMinSalinity + " PSU, maximum salinity - " + this.startPortMaxSalinity + " PSU. Recipient port " + this.endPortName + " minimum salinity - " + this.endPortMinSalinity + " PSU, maximum salinity - " + this.endPortMaxSalinity + " PSU.";
			if (riskSpecies.length > 0) {

				document.getElementById("riskMessage").style.color = "red";
				document.getElementById("riskMessage").innerHTML = "High risk";
				document.getElementById("speciesMessage").innerHTML = "2) Target species for region " + this.endPortCategory.replace('Target ','') + " in donor port not present in recipient port: ";
				document.getElementById("riskSpeciesContainer").style.display = "block";
				document.getElementById("diagramHighRisk").style.display = "inline";
				this.pdfParams.risk = "high";
				array.forEach(riskSpecies, lang.hitch(this, function(species) {
					let link = domConstruct.create("div", {class: "leftPanelLink", innerHTML: species.scientific_name}, dojo.byId("riskSpeciesContainer"), "last");
					this.pdfParams.species = this.pdfParams.species + species.scientific_name + ";";
					on(link, "click", lang.hitch(this, function() {
						this.getSpeciesInfo(species.species_id);
					}));
				}));
				this.pdfParams.species.slice(0, -1);
			}
			else {
				document.getElementById("riskMessage").style.color = "green";
				document.getElementById("riskMessage").innerHTML = "Low risk";
				document.getElementById("speciesMessage").innerHTML = "2) No target species for region " + this.endPortCategory.replace('Target ','') + " in donor port not present in recipient port.";
				document.getElementById("diagramLowRiskTS").style.display = "inline";
				this.pdfParams.risk = "low_ts";
				this.pdfParams.species = "none";
			}
		},

		getSpeciesInfo: function(id) {
			let qt = new QueryTask(this.speciesService);
			let query = new Query();
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

		downloadPDFReport: function() {
			document.getElementById("loadingCover").style.display = "block";
			let url = this.pdfService;
			url = url + "&risk=" + encodeURIComponent(this.pdfParams.risk);
			url = url + "&donorPort=" + encodeURIComponent(this.pdfParams.donorPort);
			url = url + "&donorPortArea=" + encodeURIComponent(this.pdfParams.donorPortArea);
			url = url + "&donorPortSalMin=" + encodeURIComponent(this.pdfParams.donorPortSalMin);
			url = url + "&donorPortSalMax=" + encodeURIComponent(this.pdfParams.donorPortSalMax);
			url = url + "&recipientPort=" + encodeURIComponent(this.pdfParams.recipientPort);
			url = url + "&recipientPortArea=" + encodeURIComponent(this.pdfParams.recipientPortArea);
			url = url + "&recipientPortSalMin=" + encodeURIComponent(this.pdfParams.recipientPortSalMin);
			url = url + "&recipientPortSalMax=" + encodeURIComponent(this.pdfParams.recipientPortSalMax);
			url = url + "&species=" + encodeURIComponent(this.pdfParams.species);
			url = url + "&donorYearNote=" + encodeURIComponent(this.pdfParams.donorYearNote);
			url = url + "&recipientYearNote=" + encodeURIComponent(this.pdfParams.recipientYearNote);
			url = url + "&donorSamplingNote=" + encodeURIComponent(this.pdfParams.donorSamplingNote);
			url = url + "&recipientSamplingNote=" + encodeURIComponent(this.pdfParams.recipientSamplingNote);

			let requestHandle = esriRequest({
				url: url,
				handleAs: "json"
			});
			requestHandle.then(lang.hitch(this, function (response) {
					if ((response.results[0].paramName == "result") && (response.results[0].value == 1)) {
						if ((response.results[1].paramName == "pdf") && (response.results[1].value)) {
							document.getElementById("downloadPDFNote").style.display = "block";
							window.open(response.results[1].value.url, "_blank");
							document.getElementById("pdfLink").href = response.results[1].value.url;
						}
						else {
							alert("Unable to generate PDF. Try to reload page. Contact administrator at data@helcom.fi if alert appears again..");
						}
					}
					else {
						alert("Unable to generate PDF. Try to reload page. Contact administrator at data@helcom.fi if alert appears again..");
					}
					document.getElementById("loadingCover").style.display = "none";
				}),
				lang.hitch(this, function (error) {
					document.getElementById("loadingCover").style.display = "none";
					console.log(error);
					alert("Unable to perform get PDF request. Try again or reload the page. Contact administrator at data@helcom.fi if alert appears again..");
				})
			);
		}
	});
});
