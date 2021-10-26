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
  geojsonLayer = null;
  map = null;

  @ViewChild('webtoolsMap', { static: false }) webtoolsMapElement: ElementRef;

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

    setTimeout(() => {
      // tslint:disable-next-line:no-unused-expression
      <any>$wt.map.render({
        "sidebar": {
          "print": false
        }
      }).ready((map: any) => {

        /*

        // LEAFLET

        this.cs.filteredCasesMap.forEach(m => {

           if (m.lat && m.lon) {
             L.marker([m.lon, m.lat]).bindPopup(m.name).addTo(map);
           } else {
             console.log (m);
           }
         });

         // ... use any Leaflet API
         L.marker([0.3, -3]).bindPopup("Leaflet marker").addTo(map);
  */

        this.map = map;
        window.scrollTo(0, 0);

        map.setMaxZoom(9);

        this.markersLayer = map.markers(JSON.parse(this.cs.filteredCasesMapJSON),
          {
            color: 'blue',
            events: {

              click: (layer) => {
                const properties = layer.feature.properties;
                this.cs.selectedCase = this.cs.filteredCases[properties.index];
                this.selectedIndex = parseInt(properties.index);
                this.changePageToSelected();
                layer.bindPopup(properties.name).openPopup();

              },
            }
          }).fitBounds().addTo(map);


        this.cs.filteredCasesChange.subscribe((value) => {
          map.removeLayer(this.markersLayer);
          if (this.geojsonLayer != null) {
            map.removeLayer(this.geojsonLayer);
          }

          if (this.cs.filteredCases.length > 0) {
            this.markersLayer = map.markers(JSON.parse(this.cs.filteredCasesMapJSON),
              {
                color: 'blue',
                events: {

                  click: (layer) => {
                    const properties = layer.feature.properties;
                    this.cs.selectedCase = this.cs.filteredCases[properties.index];
                    this.selectedIndex = parseInt(properties.index);
                    this.changePageToSelected();
                    layer.bindPopup(properties.name).openPopup();

                  },
                }
              }).fitBounds().addTo(map);
          }

          this.geojsonLayer = map.geojson(this.ns.nutsActiveGeometry, {
            // Styling base from properties feature.
            style: function (feature) {
              return {
                fillColor: feature.properties.stroke,
                color: feature.properties.stroke,
                weight: 2
              }
            }/* ,
            events: {
              click: function (layer) {
                map.info.show("<pre>" + JSON.stringify(layer.feature.properties, "\n", 2) + "</pre>");
              }
            } */
          }).addTo(map);

        });

        map.menu.add({
          name: 'layers',
          class: 'layer',
          tooltip: 'Show NUTS layers',
          panel: {
            name: 'layers',
            class: 'layer',
            collapse: true,
            content: [
              {
                group: {
                  title: 'List of radio',
                  description: 'Any kind of description can be put here.',
                  class: 'myCustomClass'
                },
                checkbox: [
                  {
                    label: 'Countries',
                    geojson: [{
                      data: ['/assets/NUTS_RG_01M_2021_4326_LEVL_0.json'],
                      options: {
                        color: 'red',
                        style: {
                          weight: 7,
                          fillOpacity: 0.1
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
                      data: ['/assets/NUTS_RG_01M_2021_4326_LEVL_1.json'],
                      options: {
                        color: 'tomato',
                        style: {
                          weight: 5,
                          fillOpacity: 0.1
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
                      data: ['/assets/NUTS_RG_01M_2021_4326_LEVL_2.json'],
                      options: {
                        color: 'orange',
                        style: {
                          weight: 3,
                          fillOpacity: 0.1
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
                      data: ['/assets/NUTS_RG_01M_2021_4326_LEVL_3.json'],
                      options: {
                        color: 'yellow',
                        style: {
                          weight: 1,
                          fillOpacity: 0.1
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

      });
    }, 3000);

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


    /*
     "layers": {
    "smartcountries": [{
      "data": ["EU27"],
      "options": {
        "label": true
      }
    }]
  },
  */


    //       "custom" : ["/assets/custom-wt.js"],

    this.webtoolsScript = this._renderer2.createElement('script');
    this.webtoolsScript.type = `application/json`;
    this.webtoolsScript.text = `
  {

       "service": "map",
       "version": "3.0",
       "renderTo" : "webtoolsMap",

       "map" : {
          "center" : [50,10],
          "zoom" : 4,
          "height": "80vh"
            },
         "sidebar": {
           "print": false,
           "fullscreen" : false
        }
    }
    `;
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
    const coord = this.cs.selectedCase.features[0].geometry.coordinates;
    this.map.setView([coord[1], coord[0]], 7, { animate: true });
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
    this.changePageToSelected();
    console.log(this.cs.selectedCase);
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
