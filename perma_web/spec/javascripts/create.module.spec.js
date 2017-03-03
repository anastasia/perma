var DOMHelpers = require('../../static/js/helpers/dom.helpers');
var Helpers = require('../../static/js/helpers/general.helpers');
var CreateModule = require('../../static/js/create.module');

var localStorage;
var current_user;


describe("Test create.module.js", function() {
  it("defines CreateModule", function(){
    expect(CreateModule).toBeDefined();
  });

  describe("populateWithUrl", function(){
    beforeEach(function(){
      spyOn(DOMHelpers, "setInputValue");
    });
    it("returns the correct url when one exists", function(){
      var intendedUrl = "http://research.uni.edu";
      spyOn(Helpers, "getWindowLocationSearch").and.returnValue("?url="+intendedUrl);
      var url = CreateModule.populateWithUrl();
      expect(url).toEqual(intendedUrl);
      expect(DOMHelpers.setInputValue).toHaveBeenCalled();
    });
    it("returns nothing when url does not exist", function(){
      spyOn(Helpers, "getWindowLocationSearch").and.returnValue("");
      var url = CreateModule.populateWithUrl();
      expect(url).not.toBeDefined();
      expect(DOMHelpers.setInputValue).not.toHaveBeenCalled();
    });
  });
  describe("localStorage", function(){
    /* ls related methods */
    it("defines ls", function(){
      expect(CreateModule.ls).toBeDefined();
    });
    describe("getAll", function(){
      it("returns set folders on getAll", function(){
        var setFolders = {1:{"folderIds":[27], "orgId":4}};
        spyOn(Helpers.jsonLocalStorage, "getItem").and.returnValue(setFolders);
        var folders = CreateModule.ls.getAll();
        expect(folders).toEqual(setFolders);
        expect(Helpers.jsonLocalStorage.getItem).toHaveBeenCalled();
      });
      it("returns empty object if nothing is set", function(){
        spyOn(Helpers.jsonLocalStorage, "getItem").and.returnValue("");
        var folders = CreateModule.ls.getAll();
        expect(folders).toEqual({});
      });
    });

    describe("getCurrent", function(){
      it("returns current user folder settings when they exist", function(){
        window.current_user = {id:1};
        var setFolders = {1:{"folderIds":[27], "orgId":4}};
        spyOn(Helpers.jsonLocalStorage, "getItem").and.returnValue(setFolders);
        var folders = CreateModule.ls.getCurrent();
        expect(folders).toEqual(setFolders[1]);
        expect(Helpers.jsonLocalStorage.getItem).toHaveBeenCalled();
      });
      it("returns empty object when current user settings don't exist", function(){
        window.current_user = {id:1};
        var setFolders = {2:{"folderIds":[27], "orgId":4}};
        spyOn(Helpers.jsonLocalStorage, "getItem").and.returnValue(setFolders);
        var folders = CreateModule.ls.getCurrent();
        expect(folders).toEqual({});
        expect(Helpers.jsonLocalStorage.getItem).toHaveBeenCalled();
      });
    });
    describe("setCurrent", function(){
      beforeEach(function(){
        spyOn(Helpers, "triggerOnWindow");
        window.current_user = {id:1};
        spyOn(CreateModule, "updateLinker");
        spyOn(Helpers.jsonLocalStorage, "setItem");
      });
      afterEach(function(){
        delete window.current_user;
      });
      it("sets current user folderId and orgId when they exist", function(){
        var orgId = 2, folderId = 37;
        CreateModule.ls.setCurrent(orgId, [folderId]);
        expect(Helpers.jsonLocalStorage.setItem).toHaveBeenCalledWith("perma_selection",{1:{"folderIds":[folderId],"orgId":orgId}});
        CreateModule.updateLinker();
        expect(CreateModule.updateLinker).toHaveBeenCalled();
      });
      it("sets current user folderId to default if none is provided", function(){
        var orgId = 2;
        CreateModule.ls.setCurrent(orgId);
        expect(Helpers.jsonLocalStorage.setItem).toHaveBeenCalledWith("perma_selection",{1:{"folderIds":["default"],"orgId":orgId}});
        expect(CreateModule.updateLinker).toHaveBeenCalled();
      });
    });
  });
  describe("updateLinksRemaining", function(){
    it("changes links_remaining", function(){
      spyOn(DOMHelpers, "changeText");
      window.links_remaining = 10;
      CreateModule.updateLinksRemaining(8);
      expect(window.links_remaining).toEqual(8);
      expect(DOMHelpers.changeText).toHaveBeenCalledWith('.links-remaining', 8);
    });
  });
});
