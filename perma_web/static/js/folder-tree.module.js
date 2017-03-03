require('jstree');  // add jquery support for .tree
require('jstree-css/default/style.min.css');
require('core-js/fn/array/find');

var APIModule = require('./helpers/api.module.js');
var CreateLinkModule = require('./create.module.js');


var allowedEventsCount = 0;
var lastSelectedFolder = null;
var foldersToSelect;
export var folderTree = null;

export function init () {
  loadSavedFolderSelection();
  domTreeInit();
  setupEventHandlers();
  folderTree.deselect_all();
}

function setupEventHandlers () {
  $(window)
    .on('dropdown.selectionChange', handleSelectionChange)
    .on('LinksListModule.moveLink', function(evt, data) {
      data = JSON.parse(data);
      moveLink(data.folderId, data.linkId);
    });

  // set body class during drag'n'drop
  $(document).on('dnd_start.vakata', function (e, data) {
    $('body').addClass("dragging");

  }).on('dnd_stop.vakata', function (e, data) {
    $('body').removeClass("dragging");
  });

  // folder buttons
  $('a.new-folder').on('click', function () {
    folderTree.create_node(getSelectedNode(), {}, "last");
    return false;
  });
  $('a.edit-folder').on('click', function () {
    editNodeName(getSelectedNode());
    return false;
  });
  $('a.delete-folder').on('click', function () {
    var node = getSelectedNode();
    if (!confirm("Really delete folder '" + node.text.trim() + "'?")) return false;
    folderTree.delete_node(node);
    return false;
  });
}

function handleSelectionChange () {
  folderTree.close_all();
  folderTree.deselect_all();
  loadSavedFolderSelection();
  selectSavedFolder();
}

function loadSavedFolderSelection(){
  foldersToSelect = CreateLinkModule.ls.getCurrent().folderIds;
}

function selectSavedFolder(){
  if(foldersToSelect && foldersToSelect.length){
    if(foldersToSelect[0] === "default"){
      folderTree.select_node('ul > li:first');
      foldersToSelect = null;
    }else{
      var targetNode = getNodeByFolderID(foldersToSelect[foldersToSelect.length - 1]);
      if(targetNode){
        folderTree.deselect_all();
        folderTree.select_node(targetNode);
        foldersToSelect = null;
      }
    }
  }
}

function getSelectedNode () {
  return folderTree.get_selected(true)[0];
}

function getNodeByFolderID (folderId) {
  var folderData = folderTree._model.data;
  for(var i in folderData) {
    if(folderData.hasOwnProperty(i) && folderData[i].data && folderData[i].data.folder_id === folderId) {
      return folderTree.get_node(i);
    }
  }
  return null;
}

function getSelectedFolderID () {
  return getSelectedNode().data.folder_id;
}

function editNodeName (node) {
  setTimeout(function () {
    folderTree.edit(node);
  }, 0);
}

function sendSelectionChangeEvent (node) {
  var data = {};
  if (node.data) {
    data.folderId = node.data.folder_id;
    data.orgId = node.data.organization_id;
    data.path = folderTree.get_path(node);
  }
  $(window).trigger("FolderTreeModule.selectionChange", JSON.stringify(data) );
}

function setSelectedFolder (node) {
  var data = node.data;
  if (data) {
    var folderIds = folderTree.get_path(node, false, true).map(function(id){
      return folderTree.get_node(id).data.folder_id;
    });
    CreateLinkModule.ls.setCurrent(data.organization_id, folderIds);
  }
  sendSelectionChangeEvent(node);
}

function createFolder (parentFolderID, newName) {
  return APIModule.request("POST", "/folders/" + parentFolderID + "/folders/", {name: newName});
}

function renameFolder (folderID, newName) {
  return APIModule.request("PATCH", "/folders/" + folderID + "/", {name: newName});
}

function moveFolder (parentID, childID) {
  return APIModule.request("PUT", "/folders/" + parentID + "/folders/" + childID + "/");
}

function deleteFolder (folderID) {
  return APIModule.request("DELETE", "/folders/" + folderID + "/");
}

function moveLink (folderID, linkID) {
  return APIModule.request("PUT", "/folders/" + folderID + "/archives/" + linkID + "/").done(function(data){
    $(window).trigger("FolderTreeModule.updateLinksRemaining", data.links_remaining);
    // once we're done moving the link, hide it from the current folder
    $('.item-row[data-link_id="'+linkID+'"]').closest('.item-container').remove();
  });
}

function handleShowFoldersEvent(currentFolder, callback){
  // This function gets called by jsTree with the current folder, and a callback to return subfolders.
  // We either fetch subfolders from the API, or if currentFolder.data is empty, show the root folders.
  var simpleCallback = (callbackData) => callback.call(folderTree, callbackData);

  if(currentFolder.data){
    loadSingleFolder(currentFolder.data.folder_id, simpleCallback);
  }else{
    loadInitialFolders(
      apiFoldersToJsTreeFolders(current_user.top_level_folders),
      CreateLinkModule.ls.getCurrent().folderIds,
      simpleCallback);
  }
}

function apiFoldersToJsTreeFolders(apiFolders){
  // Helper to process a list of folders from our API into the form expected by jsTree.
  return apiFolders.map(function(folder){
    var jsTreeFolder = {
      text: folder.name,
      data: {
        folder_id: folder.id,
        organization_id: folder.organization,
      },
      li_attr: {
        "data-folder_id": folder.id,
        "data-organization_id": folder.organization,
      },
      "children": folder.has_children
    };
    if(folder.organization)
      jsTreeFolder.type = "shared_folder";
    return jsTreeFolder;
  });
}

function loadSingleFolder(folderId, callback){
  // Grab a single folder ID from the server and pass back to jsTree.
  APIModule.request("GET", "/folders/" + folderId + "/folders/").done(function(data){
    callback(apiFoldersToJsTreeFolders(data.objects));
  });
}

function loadInitialFolders(preloadedData, subfoldersToPreload, callback){
  // This runs once at startup. Starting from the list of the user's root folders, fetch any
  // subfolders in the tree that the user previously had open, and load the entire tree into jsTree at the end.

  // simple case -- user has no folders selected
  if(!subfoldersToPreload){
    callback(preloadedData);
    return;
  }

  // User does have folders selected. First, have jquery fetch contents of all folders in the selected path:
  $.when.apply($, subfoldersToPreload.map(folderId => APIModule.request("GET", "/folders/" + folderId + "/folders/")))

  // When all API requests have returned, loop through the responses and build the folder tree:
  .done(function(){
    var apiResponses = arguments;
    var parentFolders = preloadedData;

    // for each folder in the path ...
    for(var i=0; i<subfoldersToPreload.length; i++){

      // find the parent folder to load subfolders into, and mark it opened:
      var folderId = subfoldersToPreload[i];
      var parentFolder = parentFolders.find(folder => folderId == folder.data.folder_id);
      if(!parentFolder)
        // tree must have changed since last time user visited
        break;
      parentFolder.state = {opened: true};

      // find the subfolders and load them in:
      var apiResponse = apiResponses[i][0];
      var subfolders = apiResponse ? apiResponse.objects : null;  // if API response doesn't make sense, we'll just stop loading the tree here
      if(subfolders && subfolders.length){
        parentFolder.children = apiFoldersToJsTreeFolders(subfolders);

        // set the loaded subfolders as the target for the next pass through this loop
        parentFolders = parentFolder.children;

      // if no subfolders, we're done
      }else{
        break;
      }
    }

    // pass our folder tree to jsTree for display
    callback(preloadedData);
  });
}

function domTreeInit () {
  $('#folder-tree')
    .jstree({
      core: {
        strings: {
          'New node': 'New Folder'
        },

        'data' : handleShowFoldersEvent,

        check_callback: function (operation, node, node_parent, node_position, more) {
          // Here we handle all actions on folders that have to be checked with the server.
          // That means we have to intercept the jsTree event, cancel it,
          // submit a request to the server, and in the success handler for that request
          // re-trigger the event so jsTree's UI will update.

          // Since we can't tell in this event handler whether an event was triggered by the user
          // (step 1) or by us (step 2), we increment allowedEventsCount when triggering
          // an event and decrement when the event is received:
          if (allowedEventsCount) {
            allowedEventsCount--;
            return true;
          }

          function getDropTarget(){
            return folderTree.get_node($('.jstree-hovered').parent());
          }

          if (more && more.is_foreign) {
            // link dragged onto folder
            if (operation == 'copy_node') {
              var targetNode = getDropTarget();
              moveLink(targetNode.data.folder_id, node.id);
            }
          } else {
              // internal folder action
            if (operation == 'rename_node') {
              var newName = node_position;
              renameFolder(node.data.folder_id, newName)
                .done(function () {
                  allowedEventsCount++;
                  folderTree.rename_node(node, newName);
                  sendSelectionChangeEvent(node);
                });
            } else if (operation == 'move_node') {
              var targetNode = getDropTarget();
              moveFolder(targetNode.data.folder_id, node.data.folder_id).done(function () {
                allowedEventsCount++;
                folderTree.move_node(node, targetNode);
              });
            } else if (operation == 'delete_node') {
              deleteFolder(node.data.folder_id).done(function () {
                allowedEventsCount++;
                folderTree.delete_node(node);
                folderTree.select_node(node.parent);
              });
            } else if (operation == 'create_node') {
              var newName = node.text;
              createFolder(node_parent.data.folder_id, newName).done(function (server_response) {
                allowedEventsCount++;
                folderTree.create_node(node_parent, node, "last", function (new_folder_node) {
                  new_folder_node.data = { folder_id: server_response.id, organization_id: node_parent.data.organization_id };
                  editNodeName(new_folder_node);
                });
              });
            }
          }
          return false; // cancel first instance of event while we check with server
        },
        multiple: true
      },
      plugins: ['contextmenu', 'dnd', 'unique', 'types'],
      dnd: {
        check_while_dragging: false,
        drag_target: '.item-row',
        drag_finish: function (data) {
        }
      },
      types: {
        "default": { // requires quotes because reserved word in IE8
          icon: "icon-folder-close-alt"
        },
        shared_folder: {
          icon: "icon-sitemap"
        }
      }
    // handle single clicks on folders -- show contents
    }).on("select_node.jstree", function (e, data) {
      if (data.selected.length == 1) {
        // showFolderContents(data.node.data.folder_id);

        // The intuitive interaction seems to be, any time you click on a closed folder we toggle it open,
        // but we only toggle to closed if you click again on the folder that was already selected.
        if(!data.node.state.opened || data.node==lastSelectedFolder)
          data.instance.toggle_node(data.node);
      }

      var lastSelectedNode = data.node;
      setSelectedFolder(lastSelectedNode);

    // handle open/close folder icon
    }).on('open_node.jstree', function (e, data) {
      if(data.node.type=="default")
        data.instance.set_icon(data.node, "icon-folder-open-alt");

    }).on('close_node.jstree', function (e, data) {
      if(data.node.type=="default")
        data.instance.set_icon(data.node, "icon-folder-close-alt");

    }).on('load_node.jstree', function (e, data) {
      // when a new node is loaded, see if it should be selected based on a user's previous visit
      selectSavedFolder();
    });
  folderTree = $.jstree.reference('#folder-tree');
}


