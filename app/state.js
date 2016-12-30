var win32 = process.platform === 'win32';

if (win32) {
  var winColor = require('windows-titlebar-color');
  document.body.style.backgroundColor = winColor.accentData.ColorizationAfterglow;
  document.body.style.WebkitTransition = 'background-color 0.2s';
  console.log(winColor)
}

import Reflux from 'reflux';
import _ from 'lodash';
import tc from 'tinycolor2'

var state = Reflux.createStore({
  init(){
    this.state = {
      // Core
      init: true,
      theme: {
        navBg: win32 ? winColor.accentData.ColorizationAfterglow : '#FFF',
        navText: win32 ? tc(winColor.accentData.ColorizationAfterglow).isDark() ? '#FFF' : '#000' : '#FFF',
        navBgAlt: winColor.accentData.ColorizationAfterglowBalance
      },
      showNav: false,
      navOptions: [
        {label: 'Processes'}
      ],
      endTask: false,
      endTaskId: null,
      view: 'processes',
      processes: null,
      processFields: [
        'Handles',
        'ProcessName',
        'PSComputerName',
        'VM',
        'WS',
        'Caption',
        'CommandLine',
        'CreationClassName',
        'CreationDate',
        'CSCreationClassName',
        'CSName',
        'Description',
        'ExecutablePath',
        'ExecutionState',
        'Handle',
        'HandleCount',
        'InstallDate',
        'KernelModeTime',
        'MaximumWorkingSetSize',
        'MinimumWorkingSetSize',
        'Name',
        'OSCreationClassName',
        'OSName',
        'OtherOperationCount',
        'OtherTransferCount',
        'PageFaults',
        'PageFileUsage',
        'ParentProcessId',
        'PeakPageFileUsage',
        'PeakVirtualSize',
        'PeakWorkingSetSize',
        'Priority',
        'PrivatePageCount',
        //'ProcessId',
        'QuotaNonPagedPoolUsage',
        'QuotaPagedPoolUsage',
        'QuotaPeakNonPagedPoolUsage',
        'QuotaPeakPagedPoolUsage',
        'ReadOperationCount',
        'ReadTransferCount',
        'SessionId',
        'Status',
        'TerminationDate',
        'ThreadCount',
        'UserModeTime',
        'VirtualSize',
        'WindowsVersion',
        'WorkingSetSize',
        'WriteOperationCount',
        'WriteTransferCount',
        'Path'
      ],
      selectedProcessFields: [
        'Name',
        'ProcessId',
        'KernelModeTime',
        'UserModeTime',
        'Priority',
        'ThreadCount',
        'WorkingSetSize',
      ],
      search: '',
      width: window.innerWidth,
      height: window.innerHeight
    };
  },
  set(obj){
    //console.log('STATE INPUT: ', obj);
    _.assignIn(this.state, obj);
    //console.log('STATE: ', this.state);
    this.trigger(this.state);
  },

  // make this remote
  /*store(obj){
    var cache = {};
    try {
      cache = global.nodeStorage.getItem('cache');
    } catch (err) {
      // the file is there, but corrupt. Handle appropriately.
    }
    if (!cache) {
      global.nodeStorage.setItem('cache', obj);
    } else {
      _.assignIn(cache, obj);
      global.nodeStorage.setItem('cache', cache);
    }
  },*/
  get(){
    return this.state;
  }
});

window.state = state;
export default state;