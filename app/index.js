import './assets/styles/app.css';
import os from 'os';
import state from './state';
import React from 'react';
import ReactDOM from 'react-dom';
import Reflux from 'reflux';
import _ from 'lodash';
import moment from 'moment';
import kmp from 'kmp';
import v from 'vquery';
import fs from 'fs';
import {remote, shell} from 'electron';
const {Menu, MenuItem} = remote;
var wProc = require('win-processes').wproc;

import logo from './assets/images/procette.png';

import * as utils from './utils';

const contextMenu = new Menu();
contextMenu.append(new MenuItem({
  label: 'Reload',
  accelerator: 'CmdOrCtrl+R',
  click (item, focusedWindow) {
    if (focusedWindow) focusedWindow.reload();
  }
}));
contextMenu.append(new MenuItem({type: 'separator'}));
contextMenu.append(new MenuItem({
  label: 'Toggle Developer Tools',
  accelerator: process.platform === 'darwin' ? 'Alt+Command+I' : 'Ctrl+Shift+I',
  click (item, focusedWindow) {
    if (focusedWindow) focusedWindow.webContents.toggleDevTools();
  }
}))
var endTask = new MenuItem({
  label: 'End Task',
  click(item, focusedWindow) {
    console.log(item, focusedWindow);
    state.set({endTask: true});
  }
});
contextMenu.append(endTask);

/*window.addEventListener('contextmenu', (e) => {
  //e.preventDefault()
  contextMenu.popup(remote.getCurrentWindow())
}, false)*/

var endTaskThrottled = _.throttle(wProc.kill, 2000, {leading: true});

var TableRow = React.createClass({
  getInitialState(){
    return {
      render: true
    };
  },
  componentWillReceiveProps(nP){
    if (nP.search.length > 0) {
      if (nP.search !== this.props.search) {
        var matches = 0;
        if (kmp(nP.row.Name.toLowerCase(), nP.search.toLowerCase()) !== -1) {
          matches++;
        }
        console.log(matches);
        this.setState({render: matches > 0});
      }
    } else {
      this.setState({render: true});
    }
    if (nP.endTask !== this.props.endTask && nP.endTask && nP.endTaskId) {
      state.set({
        endTask: false
      });
      console.log('...', nP, wProc);
      endTaskThrottled(nP.endTaskId.toString());
    }
    
  },
  handleContextMenu(){
    state.set({endTaskId: this.props.row.ProcessId});

    contextMenu.popup(remote.getCurrentWindow());
  },
  render(){
    var p = this.props;
    if (this.state.render) {
      return (
        <tr onContextMenu={this.handleContextMenu}>
          <td style={{width: '20px'}}><label className="ui-check m-a-0"><input type="checkbox" name="post[]" className="has-value" /><i className="dark-white"></i></label></td>
          {p.columns.map((column, c)=>{
            return (
              <td 
              key={c}
              style={{width: column === 'Name' ? '100px' : '75px'}}>{column.indexOf('Size') !== -1 ? utils.formatBytes(p.row[column], 2) : column.indexOf('Time') !== -1 ? utils.calcProcUsage(p.row.KernelModeTime, p.row.UserModeTime) / 28 : p.row[column]}</td>
            );
          })}
        </tr>
      );
    } else {
      return null;
    }
  }
});

var Table = React.createClass({
  getDefaultProps(){
    return {
      data: []
    };
  },
  getInitialState(){
    return {
      columns: [],
      rows: [],
      sortBy: null,
      direction: null
    };
  },
  componentDidMount(){
    var p = this.props;
    this.formatData(p, true);
    
  },
  componentWillReceiveProps(nP){
    this.formatData(nP);
  },
  formatData(p, init){
    var s = this.state;
    var columns = [];
    var rows = [];
    _.each(p.data, (item, arrKey)=>{
      if (arrKey === 0) {
        _.each(item, (value, objKey)=>{
          columns.push(objKey)
        });
      }
      rows.push(item);
    });
    this.setState({rows: _.orderBy(rows, [s.sortBy], [s.direction]), columns: columns, sortBy: init ? columns[0] : s.sortBy, direction: init ? 'asc' : s.direction});
    if (v('#splash').length > 0) {
      v('#splash').remove();
      state.set({init: false});
    }
  },
  handleDragStart(e, c){
    e.target.style.cursor = 'move';
    this.dragged = {el: e.currentTarget, c: c};
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData( 'text/plain', '' );
  },
  handleDragOver(e, c){
    this.dragged.el.style.cursor = 'move';
    console.log(c);
    this.over = {el: e.currentTarget, c: c};
  },
  handleDragEnd(e, c){
    e.target.style.cursor = 'pointer';
    var p = this.props;
    var selectedProcessFields = p.selectedProcessFields;
    selectedProcessFields = v(selectedProcessFields).move(this.dragged.c, this.over.c).ns;
    state.set({selectedProcessFields: selectedProcessFields ? selectedProcessFields : p.selectedProcessFields});
  },
  render(){
    var s = this.state;
    return (
      <div className="headercontainer">
      <div className="table-responsive tablecontainer"  style={{height: window.innerHeight - 85}}>
        <table className="table table-striped b-t b-b dataTable no-footer tableSection">
          <thead>
            <tr>
              <th style={{width: '20px'}}>
                <div>
                <label className="ui-check m-a-0">
                  <input type="checkbox" className="has-value" /><i></i>
                </label>
                </div>
              </th>
              {s.columns.map((column, c)=>{
                return (
                  <th 
                  key={c}
                  ref={`column${c}`}
                  
                  onClick={()=>this.setState({sortBy: column, direction: s.sortBy === column ? s.direction === 'desc' ? 'asc' : 'desc' : s.direction})}>
                    <div draggable={true}
                    onDragEnd={(e)=>this.handleDragEnd(e, c)}
                    onDragStart={(e)=>this.handleDragStart(e, c)}
                    onDragOver={(e)=>this.handleDragOver(e, c)} 
                    style={{width: column === 'Name' ? '100px' : '75px', cursor: this.dragged ? 'grab' : 'pointer'}}>
                      {column}
                    </div>
                    <div className={`sorting${s.sortBy === column ? '_'+s.direction : ''}`}/>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {_.orderBy(s.rows, [s.sortBy], [s.direction]).map((row, r)=>{
              return (
                <TableRow key={r} row={row} columns={s.columns} search={this.props.search} endTask={this.props.endTask} endTaskId={this.props.endTaskId}/>
              );
            })}
          </tbody>
        </table>
      </div>
      </div>
    );
  }
});

var List = React.createClass({
  render(){
    var p = this.props;
    return (
      <ul className="list inset m-a-0">
        {p.items.map((item, i)=>{
          return (
            <li key={i} className="list-item">
              <a className="list-left">
                <span className="w-40 circle warning avatar">
                  <span>{item.label.replace(/[^a-z0-9]/gi,'')[0].toUpperCase()}</span>
                  <i className="on b-white"></i>
                </span>
              </a>
              <div className="list-body">
                <div><a href>{item.label}</a></div>
                <small className="text-muted text-ellipsis">{item.subLabel}</small>
              </div>
            </li>
          );
        })}
      </ul>
    );
  }
});

var Aside = React.createClass({
  handleFieldChange(e, field){
    var p = this.props;
    if (e.target.checked) {
      p.s.selectedProcessFields.push(field);
    } else {
      var refField = _.findIndex(p.s.selectedProcessFields, (f)=>{
        return f === field;
      });
      _.pullAt(p.s.selectedProcessFields, refField);
    }
    state.set({selectedProcessFields: p.s.selectedProcessFields});
  },
  render(){
    var p = this.props;
    console.log(p.s.selectedProcessFields);
    return (
      <div id="aside" className="app-aside modal fade nav-dropdown" style={{
        top: '1px',
        maxWidth: p.s.showNav ? '13.5rem' : '0rem',
        width: p.s.showNav ? '13.5rem' : '0rem',
        WebkitTransition: 'max-width 0.2s, width 0.2s'
      }}>
        <div className="left navside dark dk" style={{
          backgroundColor: p.s.showNav ? p.s.theme.navBgAlt : p.s.theme.navBg,
          WebkitTransition: 'background-color 0.2s'
        }}>
          <div className="hide-scroll" style={{overflowY: 'hide'}}>
            <nav className="scroll nav-light">
              <ul className="nav">
                
               <li className="">
                  <a style={{paddingLeft: '6px'}} onClick={()=>state.set({showNav: false})}>

                    <span className="nav-icon">
                      <i className="material-icons">&#xe5d2;</i>
                    </span>
                    <span className="nav-text">Settings</span>
                  </a>
                </li>
            
              </ul>
              <div style={{
                fontSize: '11px', 
                maxHeight: window.innerHeight - 38, 
                overflowY: 'auto', 
                overflowX: 'hidden', 
                position: 'relative', 
                top: '1px',
                paddingLeft: '10px'
              }}>
                  {p.s.processFields.map((field, f)=>{
                    var isSelected = ()=>{
                      var match = 0;
                      for (var i = p.s.selectedProcessFields.length - 1; i >= 0; i--) {
                        if (p.s.selectedProcessFields[i] === field) {
                          ++match;
                        }
                      }
                      return match >0;
                    };
                    return (
                      <div key={f} className="checkbox">
                        <label className="ui-check">
                          <input type="checkbox" checked={isSelected()} onChange={(e)=>this.handleFieldChange(e, field)}/>
                          <i className="dark-white"></i>
                          {field}
                        </label>
                      </div>
                    );
                  })}
                  </div>
            </nav>
          </div>
        </div>
      </div>
    );
  }
});
const ps = require('win-ps'); 

var App = React.createClass({
  mixins: [Reflux.ListenerMixin],
  getInitialState(){
    return state.get();
  },
  componentDidMount(){
    this.listenTo(state, this.stateChange);
    this.setState({init: false});
    this.getProcesses();
    v('style').n.innerHTML += `
      .ui-check input:checked + i:before {
          background-color: ${this.state.theme.navBg};
      }
    `
  },
  stateChange(e){
    this.setState(e);
  },
  getProcesses(){
    if (this.procTick) {
      clearTimeout(this.procTick)
    }
    ps.snapshot(this.state.selectedProcessFields).then((list) => {
      state.set({processes: list});
      this.procTick = setTimeout(this.getProcesses, 500);
    });
  },
  render(){
    var s = this.state;
    s.init = false
    return (
      <div className="app" id="app">
        <Aside s={s} />
        <div id="content" className="app-content box-shadow-z0" role="main" style={{
          overflowX: 'hidden',
          top: '38px',
          position: 'absolute',
          left: '0px',
          right: '0px',
          marginLeft: s.showNav ? '13.5rem' : '0rem',
          opacity: v('#splash').length > 0 ? '0' : '1',
          WebkitTransition: 'margin-left 0.2s, opacity 0.2s',
        }}>
          <div className="app-header white box-shadow" style={{
            height: '20px'
          }}>
            <div className="navbar" style={{
              backgroundColor: s.theme.navBg, 
              color: s.theme.navText,
              borderRadius: '0px',
              height: '37px',
              paddingLeft: '6px'
            }}>          
              {!s.showNav ?
              <a style={{cursor: 'pointer'}} onClick={()=>state.set({showNav: !s.showNav})} className="navbar-item pull-left">
                <i className="material-icons">&#xe5d2;</i>
              </a> : null}
              <div className="navbar-toggleable-sm" id="collapse" style={{display: 'inline-block'}}>
                <ul className="nav navbar-nav">
                  <li className="nav-item dropdown">
                    <a className="nav-link" href data-toggle="dropdown">
                      <span>{_.upperFirst(s.view)}</span>
                    </a>
                  </li>
                </ul>
              </div>
              <input 
              placeholder="Search..."
              className="form-control pull-right" 
              style={{height: '20px', width: '200px', paddingLeft: '5px', paddingRight: '5px', fontSize: '12px'}}
              value={s.search}
              onChange={(e)=>state.set({search: e.target.value})}/>
            </div>
          </div>
          <div className="app-footer">
            <div className="p-a text-xs">
    
              <div className="nav" style={{paddingLeft: '4px'}}>
                {/*<span>About</span>*/}
              </div>
            </div>
          </div>
          <div className="app-body" id="view" style={{paddingTop: '0px'}}>
            <div className="row">
              <div className="col-sm-12">
                <div className="box">
                  {s.processes && s.processes.length > 0 ? <Table data={s.processes} search={s.search} selectedProcessFields={s.selectedProcessFields} init={s.init} endTask={s.endTask} endTaskId={s.endTaskId}/> : null}
                </div>
              </div>
            </div>        
          </div>
        </div>
      </div>
    );
  }
});

// Render to the #app element
ReactDOM.render(
  <App />,
  document.getElementById('app')
)