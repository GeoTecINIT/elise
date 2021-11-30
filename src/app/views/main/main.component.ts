import { Component, OnInit, Inject, Renderer2, ElementRef, ViewChild, AfterContentInit } from '@angular/core';
import { CasesService } from '../../services/cases.service';
import { NutsService } from '../../services/nuts.service';
import { OptionsService } from '../../services/options.service';
import nutsJSON from '../../../assets/nuts-labels.json';
import { icon, latLng, Layer, marker, tileLayer, geoJSON, polygon } from 'leaflet';
import { createAsExpression } from 'typescript';
import { DOCUMENT } from '@angular/common';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';


declare var $wt: any;
declare var L: any;

@Component({
  selector: 'app-main',
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.css']
})
export class MainComponent implements OnInit, AfterContentInit {

  @ViewChild('webtoolsMap') webtoolsMapDiv: ElementRef;
  @ViewChild('contentSelect') contentSelectDiv: ElementRef;

  simpleSlider = 40;
  doubleSlider = [20, 60];
  state_default: boolean = true;
  focus: any;

  nuts: any = nutsJSON;
  nuts0Labels = [];
  nuts1Labels = [];
  nuts2Labels = [];
  nuts3Labels = [];

  selectedCaseMap = -1;
  selectedIndex = -1;

  pageLength = 5;

  // map: any;
  pinnedCase: null;

  collapseSelDesc = true;
  collapsePinDesc = true;

  collapseLocSelDesc = true;
  collapseLocPinDesc = true;

  listMapVisible = 1; // 1 is half, 0 - only list, 2 - only map

  iconsOGC = {
    'Location & Position': 'map-marker',
    'Spatial-Temporal Models': 'map',
    'Data Science': 'flask',
    'Human Interfaces': 'user',
    'Physical Geosciences': 'image',
    'Societal Geosciences': 'users',
    'Sensing and Observations': 'thermometer',
    'Computer Engineering': 'desktop'
  };


  iconsTrend = {
    'Artificial Intelligence and Machine Learning': 'cogs',
    'Cloud Native Computing': 'cloud',
    'Edge Computing': 'laptop',
    'Blockchain': 'link',
    'Immersive Visualisation(VR, MR, AR)': 'eye',
    'Connected Autonomous Vehicles': 'car',
    'UxS / Drones': 'paper-plane',
    'Urban Digital Twins': 'building',
    '5G Cellular': 'signal'
  };


  iconsTheme = {
    '1 - General public services': 'road',
    '2 - Defence': 'shield',
    '3 - Public order and safety': 'fire-extinguisher',
    '4 - Economic affairs': 'money',
    '5 - Environmental protection': 'tree',
    '6 - Housing and community amenities': 'home',
    '7 - Health': 'heartbeat',
    '8 - Recreation, culture and religion': 'glass',
    '9 - Education': 'graduation-cap',
    '10 - Social protection': 'street-view'
  };

  layersControl = null;

  layerGEOJSON = null;
  loadingMap = true;
  webtoolsScript: any;
  markersLayer = null;
  markersSelLayer = null;
  geojsonLayer = null;
  map = null;

  changes: any;

  constructor(public cs: CasesService,
    public ns: NutsService,
    public tas: OptionsService,
    private _renderer2: Renderer2,
    private modalService: NgbModal,
    @Inject(DOCUMENT) private _document: Document) {
    this.loadingMap = true;
  }
  ngAfterContentInit(): void {

    // needed to display map
    window.addEventListener('DOMContentLoaded', (event) => {
      this._renderer2.appendChild(this._document.body, this.webtoolsScript);
      window.scrollTo(0, 1000);
    });

    this.loadMap();
  }

  ngOnInit() {

    this.nuts.forEach((n: { NUTS_ID: string | any[]; CNTR_CODE: any; NAME_LATN: any; NUTS_NAME: any; }) => {
      // console.log(n.NUTS_ID);
      if (n.NUTS_ID.length === 2) { // NUTS 0
        this.nuts0Labels.push({ NUTS_ID: n.NUTS_ID, CNTR_CODE: n.CNTR_CODE, NAME_LATN: n.NAME_LATN, NUTS_NAME: n.NUTS_NAME, active: false })
      } else if (n.NUTS_ID.length === 3) { // NUTS 1
        this.nuts1Labels.push({ NUTS_ID: n.NUTS_ID, CNTR_CODE: n.CNTR_CODE, NAME_LATN: n.NAME_LATN, NUTS_NAME: n.NUTS_NAME, active: false })
      } else if (n.NUTS_ID.length === 4) { // NUTS 2
        this.nuts2Labels.push({ NUTS_ID: n.NUTS_ID, CNTR_CODE: n.CNTR_CODE, NAME_LATN: n.NAME_LATN, NUTS_NAME: n.NUTS_NAME, active: false })
      } else if (n.NUTS_ID.length > 4) { // NUTS 3
        this.nuts3Labels.push({ NUTS_ID: n.NUTS_ID, CNTR_CODE: n.CNTR_CODE, NAME_LATN: n.NAME_LATN, NUTS_NAME: n.NUTS_NAME, active: false })
      }
    });

    this.webtoolsScript = this._renderer2.createElement('script');
    this.webtoolsScript.type = `application/json`;
    this.webtoolsScript.text = `
  {

       "service": "map",
       "version": "3.0",
       "renderTo" : "webtoolsMap",

       "map" : {
          "center" : [50,10],
          "zoom" : 3,
          "height": "80vh"
            },
         "sidebar": {
           "print": false,
           "fullscreen" : false
        }
    }
    `;
  }

  loadMap() {
    setTimeout(() => {
     // console.log('LOAD MAP');
      // tslint:disable-next-line:no-unused-expression
      window.scrollTo(0, 10);
      window.scrollTo(0, 0);
      if (<any>$wt.map) {
        <any>$wt.map.render({
          "sidebar": {
            "print": false
          }
        }).ready((map: any) => {

          if (map) {
            this.map = map;
            map.setMaxZoom(9);
            this.loadingMap = false;

            this.markersLayer = map.markers(JSON.parse(this.cs.filteredCasesMapJSON),
              {
                color: 'blue',
                events: {
                  click: (layer) => {
                    const properties = layer.feature.properties;
                    this.cs.selectedCase = this.cs.filteredCases[properties.index];
                    this.selectedIndex = parseInt(properties.index);
                    this.updateMarkerSel();
                    layer.bindPopup(properties.name).openPopup();
                  },
                }
              }).addTo(map);

            this.ns.addGeometriesToHash();

            this.cs.filteredCasesChange.subscribe((value) => {
              this.loadingMap = true;

              if (this.markersLayer != null) {
                map.removeLayer(this.markersLayer);
              }
              if (this.geojsonLayer != null) {
                map.removeLayer(this.geojsonLayer);
              }
              if (this.cs.filteredCasesMapJSON.length > 50) {
                this.markersLayer = map.markers(JSON.parse(this.cs.filteredCasesMapJSON), {

                  group: function (feature) {
                    var prop = feature.properties;
                    if (prop.color === 'blue') {
                      return {
                        name: prop.name,
                        color: "blue"
                      }
                    } else {
                      return {
                        name: prop.name,
                        color: "#128570"
                      }
                    }
                  },
                  events: {
                    click: (layer) => {
                      const properties = layer.feature.properties;
                      this.cs.selectedCase = this.cs.filteredCases[properties.index];
                      this.selectedIndex = parseInt(properties.index);
                      this.updateMarkerSel();
                      layer.bindPopup(properties.name).openPopup();
                    }
                  }

                }).addTo(map);
              }

              this.geojsonLayer = map.geojson(this.ns.nutsActiveGeometry, {
                // Styling base from properties feature.
                style: function (feature) {
                  return {
                    fillColor: feature.properties.stroke,
                    color: feature.properties.stroke,
                  }
                }
              }).addTo(map);

              this.loadingMap = false;

            });
            /* 
                      this.cs.filteredCasesChange.subscribe((value) => {
                        this.loadingMap = true;
                        if (this.markersLayer != null) {
                          map.removeLayer(this.markersLayer);
                        }
                        if (this.markersSelLayer != null) {
                          map.removeLayer(this.markersSelLayer);
                        }
                        if (this.geojsonLayer != null) {
                          map.removeLayer(this.geojsonLayer);
                        }
                        if (this.cs.filteredCases.length > 0) {
            
                          if (this.cs.filteredCasesMapJSON.length > 50) {
                            this.markersLayer = map.markers(JSON.parse(this.cs.filteredCasesMapJSON),
                              {
                                color: 'blue',
                                events: {
                                  click: (layer) => {
                                    const properties = layer.feature.properties;
                                    this.cs.selectedCase = this.cs.filteredCases[properties.index];
                                    this.selectedIndex = parseInt(properties.index);
                                    this.updateMarkerSel();
                                    layer.bindPopup(properties.name).openPopup();
                                  },
                                }
                              }).addTo(map);
                          }
                          if (this.cs.filteredCasesMapSelJSON.length > 50) {
                            this.markersSelLayer = map.markers(JSON.parse(this.cs.filteredCasesMapSelJSON),
                              {
                                color: '#128570',
                                events: {
                                  click: (layer) => {
                                    const properties = layer.feature.properties;
                                    layer.bindPopup(properties.name).openPopup();
                                  },
                                }
                              }).addTo(map);
                          }
                        }
            
                        this.geojsonLayer = map.geojson(this.ns.nutsActiveGeometry, {
                          // Styling base from properties feature.
                          style: function (feature) {
                            return {
                              fillColor: feature.properties.stroke,
                              color: feature.properties.stroke,
                            }
                          }
                        }).addTo(map);
            
                        this.loadingMap = true;
            
                      }); */

            map.menu.add({
              name: 'layers',
              class: 'layer',
              tooltip: 'Show geographic layers',
              panel: {
                name: 'layers',
                class: 'layer',
                collapse: true,
                content: [
                  {
                    group: {
                      title: 'Visualise geographic layers',
                      description: 'Last selected layer will be on top',
                      class: 'myCustomClass'
                    },
                    checkbox: [
                      {
                        label: 'Countries',
                        geojson: [{
                          data: ['/elise/assets/NUTS_RG_01M_2021_4326_LEVL_0.json'],
                          options: {
                            color: 'black',
                            style: {
                              weight: 1.2,
                              fillOpacity: 0.05
                            },
                            events: {
                              tooltip: {
                                content: '<b>{NAME_LATN}</b>',
                                options: {
                                  direction: 'top',
                                  sticky: false
                                }
                              }
                            }
                          }
                        }]
                      },
                      {
                        label: 'Greater Regions',
                        geojson: [{
                          data: ['/elise/assets/NUTS_RG_01M_2021_4326_LEVL_1.json'],
                          options: {
                            color: 'blue',
                            style: {
                              weight: 1,
                              fillOpacity: 0.05
                            },
                            events: {
                              tooltip: {
                                content: '<b>{NAME_LATN}</b>',
                                options: {
                                  direction: 'top',
                                  sticky: false
                                }
                              }
                            }
                          }
                        }]
                      },
                      {
                        label: 'Regions',
                        geojson: [{
                          data: ['/elise/assets/NUTS_RG_01M_2021_4326_LEVL_2.json'],
                          options: {
                            color: 'green',
                            style: {
                              weight: 1,
                              fillOpacity: 0.05
                            },
                            events: {
                              tooltip: {
                                content: '<b>{NAME_LATN}</b>',
                                options: {
                                  direction: 'top',
                                  sticky: false
                                }
                              }
                            }
                          }
                        }]
                      },
                      {
                        label: 'Sub-Regions',
                        geojson: [{
                          data: ['/elise/assets/NUTS_RG_01M_2021_4326_LEVL_3.json'],
                          options: {
                            color: 'red',
                            style: {
                              weight: 0.5,
                              fillOpacity: 0.05
                            },
                            events: {
                              tooltip: {
                                content: '<b>{NAME_LATN}</b>',
                                options: {
                                  direction: 'top',
                                  sticky: false
                                }
                              }
                            }
                          }
                        }]
                      }
                    ]

                  }
                ],
              }
            });

            // Add a custom button.
            map.menu.add({
              name: "custom",
              class: "locate",
              tooltip: "Zoom to selected case",
              click: (evt) => {
                if (this.cs.selectedCase) {
                  var markers = [];
                  this.cs.selectedCase.features.forEach(f => {
                    markers.push(L.marker([f.geometry.coordinates[1], f.geometry.coordinates[0]]))
                  });
                  var featureGroup = L.featureGroup(markers);
                  map.fitBounds(featureGroup.getBounds());
                } else {
                  this.modalService.open(this.contentSelectDiv, { size: 'sm' });
                }
              }
            });
          }
        })
      } else {
        this.loadMap();
      }
    }, 1000);
  }


  filterByTheme() {
    const themeActives = [];
    this.tas.thematicAreas.forEach((ta: { active: any; number: any; }) => {
      if (ta.active) {
        themeActives.push(ta.number);
      }
    });
    this.cs.filterByThemeArea();
  }


  updateModels() { // when removing geografic region
    this.ns.nuts0Active = [... this.ns.nuts0Active];
    this.ns.nuts1Active = [... this.ns.nuts1Active];
    this.ns.nuts2Active = [... this.ns.nuts2Active];
    this.ns.nuts3Active = [... this.ns.nuts3Active];
    this.cs.filterByGeoExtent();
  }

  clickCard(i) {
    this.cs.selectedCase = this.cs.filteredCases[i + (this.cs.pagination - 1) * this.pageLength];
    this.updateMarkerSel();
    this.selectedIndex = i + (this.cs.pagination - 1) * this.pageLength;
    // const coord = this.cs.selectedCase.features[0].geometry.coordinates;
    // this.map.setView([coord[1], coord[0]], 9, { animate: true });
  }

  changePageToSelected() {
    if (this.cs.selectedCase != null) {
      let caseI = 0;
      this.cs.filteredCases.forEach(element => {
        caseI++;
        if (element.featureIndex === this.cs.selectedCase.featureIndex) {
          this.cs.pagination = Math.ceil(caseI / this.pageLength);
        }
      });
    }
  }

  updateMarkerSel() {
    this.cs.addMarkersCollection();
    this.changePageToSelected();
    this.collapseSelDesc = true;
    this.collapsePinDesc = true;

    this.collapseLocSelDesc = true;
    this.collapseLocPinDesc = true;
    // console.log(this.cs.selectedCase);
  }

  openModalAbout(content) {
    this.modalService.open(content, { size: 'lg' });
  }

  openModalWarning(content) {
    if (this.pinnedCase != null) {
      this.modalService.open(content, { size: 'sm' });
    } else {
      this.pinnedCase = this.cs.selectedCase;
      this.cs.selectedCase = null;
      this.updateMarkerSel();
    }
  }
}
