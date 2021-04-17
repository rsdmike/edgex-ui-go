/*******************************************************************************
 * Copyright © 2021-2022 VMware, Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License. You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the License
 * is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express
 * or implied. See the License for the specific language governing permissions and limitations under
 * the License.
 * 
 * @author: Huaqiao Zhang, <huaqiaoz@vmware.com>
 *******************************************************************************/

import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';

import { DeviceService } from '../../../contracts/v2/device-service';
import { MultiDeviceServiceResponse } from '../../../contracts/v2/responses/device-service-response';
import { Device } from '../../../contracts/v2/device';
import { DeviceProfile } from '../../../contracts/v2/device-profile';
// import { MultiDeviceProfileResponse } from '../../../contracts/v2/responses/device-profile-response';
import { AutoEvent } from '../../../contracts/v2/auto-event';

import { MetadataService } from '../../../services/metadata.service';
import { MessageService } from '../../../message/message.service';

class MqttProtocolTemplate {
  Schema: string = "";
  Host: string = "";
  Port: string = "";
  User: string = "";
  Password: string = "";
  ClientId: string = "";
  Topic: string = "";
}

class ModusTCPProtocolTemplate {
  Address: string = "";
  Port: string = "";
  UnitID: string = "";
}

class ModusRTUProtocolTemplate {
  Address: string = "";
  UnitID: string = "";
  BaudRate: string = "";
  DataBits: string = "";
  StopBits: string = "";
  Parity: string = ""; // Parity: N - None, O - Odd, E - Even
}

class AutoEventInternal {
  frequency: string = '';
  onChange: boolean = false;
  resource: string = '';
  unit: string = ''
}

declare type protocol = {
  [key: string]: any;
};

declare type properties = {
  [key: string]: any;
};

@Component({
  selector: 'app-add-device',
  templateUrl: './add-device.component.html',
  styleUrls: ['./add-device.component.css']
})
export class AddDeviceComponent implements OnInit {

  currentStep = 0;
  selectedClass = "text-white rounded px-2 bg-success  font-weight-bold";
  noSelectedClass = "text-white rounded px-2 bg-secondary  font-weight-bold";
  selectedSvc?: DeviceService;
  selectedProfile?: DeviceProfile;
  newDevice?: Device;

  autoEventsInternal: AutoEventInternal[] = [{
    frequency: '',
    onChange: false,
    resource: '',
    unit: 'ms'
  }];

  deviceName: string = '';
  deviceDescription: string = '';
  deviceLabels?: string;
  deviceAdminState: string = 'UNLOCKED';
  deviceOperatingState: string = 'UP';

  protocolTemplateModel: string = "avaliable";
  protocolName: string = '';
  protocolProperty: properties = {
    "key": null,
    "value": null
  };
  protocolPropertyList: properties[] = [{
    "key": null,
    "value": null
  }];

  selectedAvailTemplate: any;
  selectedAvailTemplateProperties: string[] = [];

  constructor(private metaSvc: MetadataService,
    private msgSvc: MessageService,
    private router: Router,
    private route: ActivatedRoute
  ) { }

  ngOnInit(): void {
  }

  onSingleProfileSelected(profile: DeviceProfile) {
    this.selectedProfile = profile;
  }

  onSingleDeviceSvcSelected(svc: DeviceService) {
    this.selectedSvc = svc;
  }

  onAvailProtocolSelect() {
    switch (this.protocolName) {
      case 'mqtt':
        this.selectedAvailTemplate = new MqttProtocolTemplate();
        this.selectedAvailTemplateProperties = Object.keys(this.selectedAvailTemplate)
        return
      case 'modbus-tcp':
        this.selectedAvailTemplate = new ModusTCPProtocolTemplate();
        this.selectedAvailTemplateProperties = Object.keys(this.selectedAvailTemplate)
        return
      case 'modbus-rtu':
        this.selectedAvailTemplate = new ModusRTUProtocolTemplate();
        this.selectedAvailTemplateProperties = Object.keys(this.selectedAvailTemplate)
        return
      default:
        this.selectedAvailTemplate = {};
        this.selectedAvailTemplateProperties = [];
        return
    }

  }

  cleanSelectedAvailTemplateProperties() {
    this.selectedAvailTemplateProperties = [];
  }

  setAutoEventInternal(events: AutoEvent[]) {
    let unit: string;

    events.forEach(e => {
      let index: number = 0;
      if ((e.frequency as string).indexOf('ms')) {
        index = (e.frequency as string).indexOf('ms');
      } else if ((e.frequency as string).indexOf('s')) {
        index = (e.frequency as string).indexOf('s');
      } else if ((e.frequency as string).indexOf('m')) {
        index = (e.frequency as string).indexOf('m');
      } else if ((e.frequency as string).indexOf('h')) {
        index = (e.frequency as string).indexOf('h');
      }
      unit = (e.frequency as string).substring(index)
      this.autoEventsInternal.push({
        frequency: (e.frequency as string).slice(0, index),
        onChange: e.onChange as boolean,
        resource: e.sourceName as string,
        unit: unit
      });
    });
  }

  eventFrequencyNumType(frequency: any): boolean {
    if (!isNaN(frequency) && (parseFloat(frequency) === parseInt(frequency))) {
      return true
    }
    return false
  }

  setProtocolTemplate(model: string) {
    this.protocolName = "";
    this.cleanSelectedAvailTemplateProperties();
    this.cleanCustomProtocolProperty();
    this.protocolTemplateModel = model;
  }

  addProtocolProperty() {
    this.protocolPropertyList.push({
      "key": '',
      "value": ''
    });
  }

  removeProtocolProperty(property: any) {
    this.protocolPropertyList.splice(this.protocolPropertyList.indexOf(property), 1)
  }

  cleanCustomProtocolProperty() {
    this.protocolPropertyList = [];
    this.protocolPropertyList.push({
      "key": '',
      "value": ''
    });
  }

  addAutoEvent() {
    this.autoEventsInternal.push({
      frequency: '',
      onChange: false,
      resource: '',
      unit: 'ms'
    });
  }

  removeAutoEvent(event: AutoEventInternal) {
    this.autoEventsInternal.splice(this.autoEventsInternal.indexOf(event), 1);
  }

  stepStateLock(): boolean {
    switch (this.currentStep) {
      case 0:
        return this.selectedSvc === undefined
      case 1:
        return this.selectedProfile === undefined
      case 2:
        return this.deviceName === undefined || this.deviceName === ''
      case 3:
        let flag = false;
        this.autoEventsInternal.forEach((event) => {
          if (event.resource === '' || !this.eventFrequencyNumType(event.frequency)) {
            flag = true;
            return
          }
        });
        return flag
      case 4:
        return false
      default:
        return false
    }
  }

  skip() {
    this.autoEventsInternal = [];
    this.next();
  }

  next() {
    this.currentStep += 1;
  }

  previous() {
    this.currentStep = this.currentStep - 1;
  }

  changeStep() {
    this.currentStep += 1;
  }

  done() {
    let protocol: protocol = {};
    let properties: properties = {};

    if (this.protocolTemplateModel === 'custom') {
      this.protocolPropertyList.forEach((p) => {
        properties[p.key] = p.value
      });
      protocol[this.protocolName] = properties;
    } else {
      protocol[this.protocolName] = Object.assign({}, this.selectedAvailTemplate);
    }

    let autoEvents: AutoEvent[] = [];

    this.autoEventsInternal.forEach((event) => {
      autoEvents.push({
        frequency: `${parseInt(event.frequency)}${event.unit}`,
        onChange: event.onChange?true:false,
        sourceName: event.resource
      })
    });

    let device: Device = {
      name: this.deviceName,
      description: this.deviceDescription,
      labels: this.deviceLabels?.split(','),
      adminState: this.deviceAdminState,
      operatingState: this.deviceOperatingState,
      serviceName: this.selectedSvc?.name as string,
      profileName: this.selectedProfile?.name as string,
      protocols: protocol,
      autoEvents: autoEvents
    } as Device

    this.metaSvc.addDevice(device).subscribe(() => {
      this.msgSvc.success('Add device');
      this.router.navigate(['../device-list'], { relativeTo: this.route })
    })
  }
}