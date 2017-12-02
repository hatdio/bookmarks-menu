/*
 * bookmarks menu object:
 * methods: init, domenu, load, click, shutdown, observe, bmListener, addButtonAtFirstTime
 * version 1.1:
 * - fixed: now separators displays correctly as separators
 * - added one more option: include both (bookmarks toolbar and search results in a subfolder)
 * - added an observer: so if you make changes in your bookmarks 'Bookmarks menu' will update it's menu!
 * - fixed: submenus now have folder icon
 *
 * version 1.11:
 * added a 4rth option to inlude all bookmark items
 * fixed: long url labels trimmed down
 *
 * version 1.12:
 * fixed: small fix in 4rth option (error with book. toolbar items)
 *
 * version 1.2:
 * added: new option for middle click (on a bookmark): fore-background
 * added: new option: display menu item 'Open All in Tabs' in sub-folders
 * added: context menu on right click
 * added: when addon installing, on firefox restart install also the toolbar button automatically
 * some bug fixes
 *
 * version 1.121:
 * fixed: when installing first time the tolbar button the menu was not loading
 * fixed: bug on observer: on change item the bookmark url was setting wrong
 * 
 * version 1.22:
 * now compatible with Firefox 3.6
 *
 * version 1.3:
 * added: option on mouse over, open menu
 *
 * version 1.34:
 * added: option keep open menu after a click
 *
 * version 1.5:
 * fixed: in observer check if multiple items added/removed dont load everey time
 *
 * version 1.6:
 * fixed: open bookmark properties (in context-menu)
 * added: option to open bookmarks in new tab (on left click)
 * version 1.7:
 * fixed: removed getFaviconForPage & getFaviconImageForPage, been deprecated by mozilla
 * version 1.8:
 * added: on click if ctrl key pressed, open new tab (like middle click)
 * added: menu item cursor pointer
 * added: hide 'Options' option
 * added: hide 'Delete' in popup option
 * version 1.9:
 * added: show 'Recently Bookmarked' folder option
 * added: show 'Most Visited' folder option
*/

var bookmarksMenuAddon = {
	isLoaded :  false,
	init : function() {
		this.pref = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService).getBranch("extensions.bookmark-menu.");
		this.firefox = document;
		var toolbar = this.pref.getIntPref("toolbar");
		var firstTime = this.pref.getBoolPref("firstTime");
		this.midBack = this.pref.getBoolPref("midBack");
		this.addOpenAll = this.pref.getBoolPref("addOpenAll");
		this.onoverOpen = this.pref.getBoolPref("onoverOpen");
		this.keepOpen = this.pref.getBoolPref("keepOpen");
		this.openNewTab = this.pref.getBoolPref("openNewTab");
		this.hideOptions = this.pref.getBoolPref("hideOptions");
		this.hideDelete = this.pref.getBoolPref("hideDelete");
		this.showRecent = this.pref.getBoolPref("showRecent");
		this.showTop = this.pref.getBoolPref("showTop");
		this.ioService = Components.classes["@mozilla.org/network/io-service;1"].getService(Components.interfaces.nsIIOService);  

		if (firstTime)
			setTimeout("bookmarksMenuAddon.addButtonAtFirstTime()", 1000);		//add menubutton to nav-bar on first startup after 1sec

		this.pref.QueryInterface(Components.interfaces.nsIPrefBranch2);
		this.historyService = Components.classes["@mozilla.org/browser/nav-history-service;1"]
			.getService(Components.interfaces.nsINavHistoryService);
		this.options = this.historyService.getNewQueryOptions();
		this.faviconService = Components.classes["@mozilla.org/browser/favicon-service;1"]
			.getService(Components.interfaces.nsIFaviconService);

		this.bmsvc = Components.classes["@mozilla.org/browser/nav-bookmarks-service;1"]
                      .getService(Components.interfaces.nsINavBookmarksService);
		this.bmsvc.addObserver(this.bmListener, false);

		/* context popup menu */
		this.popup = document.getElementById("bookmarksMenuAddonPopup");
		this.load();

		this.pref.addObserver("", this, false);
	},
	popupItems : function() {
		var item;
		// remove any items
		while (this.popup.firstChild)
			this.popup.removeChild(this.popup.firstChild);

		if (!document.popupNode)
				return false;

		switch (document.popupNode._type)
		{
			case 'bookmark':
				item = document.createElement('menuitem');
				item.setAttribute('label', 'Open');
				item.setAttribute("class", "menuitem-iconic");
				item.addEventListener('click', function(e) {
					window._content.document.location = document.popupNode._uri;
				}, false);
				this.popup.appendChild(item);

				item = document.createElement('menuitem');
				item.setAttribute('label', 'Open in a New Window');
				item.setAttribute("class", "menuitem-iconic");
				item.addEventListener('click', function(e) {
					window.open(document.popupNode._uri, "popup", "");
				}, false);
				this.popup.appendChild(item);

				item = document.createElement('menuitem');
				item.setAttribute('label', 'Open in a New Tab');
				item.setAttribute("class", "menuitem-iconic");
				item.addEventListener('click', function(e) {
					document.getElementById("content").loadOneTab(document.popupNode._uri, null, null, null, false, null);
				}, false);
				this.popup.appendChild(item);

				item = document.createElement('menuseparator');
				this.popup.appendChild(item);

				if (!this.hideDelete) {
					item = document.createElement('menuitem');
					item.setAttribute('label', 'Delete');
					item.setAttribute("class", "menuitem-iconic");
					item.addEventListener('click', function(e) {
						bookmarksMenuAddon.bmsvc.removeItem(document.popupNode._id);
					}, false);
					this.popup.appendChild(item);
				}

				item = document.createElement('menuitem');
				item.setAttribute('label', 'Properties');
				item.setAttribute("class", "menuitem-iconic");
				item.addEventListener('click', function(e) {
					PlacesUIUtils.showBookmarkDialog({
						'action': "edit",
						'type': "bookmark",
						'itemId': document.popupNode._id
						},  window);
				}, false);
				this.popup.appendChild(item);
			break;

			case 'special':
			case 'search':
			case 'folder':
				item = document.createElement('menuitem');
				item.setAttribute('label', 'Open All in Tabs');
				item.setAttribute("class", "menuitem-iconic");
				item.addEventListener('click', function(e) {
					var el = document.popupNode.getElementsByTagName("menupopup")[0];
					var i, c, a = new Array();
					for (i= 0; i < el.childNodes.length; i++) {
						c = el.childNodes[i];
						if (c._uri)
							a[a.length] = c._uri;
					}

					if (a.length)
						document.getElementById("content").loadTabs(a, true, true);
				}, false);
				this.popup.appendChild(item);

				if (document.popupNode._type == 'folder') { // props only in folder
					item = document.createElement('menuseparator');
					this.popup.appendChild(item);

					item = document.createElement('menuitem');
					item.setAttribute('label', 'Delete');
					item.setAttribute("class", "menuitem-iconic");
					item.addEventListener('click', function(e) {
						bookmarksMenuAddon.bmsvc.removeItem(document.popupNode._id);
					}, false);
					this.popup.appendChild(item);

					item = document.createElement('menuitem');
					item.setAttribute('label', 'Properties');
					item.setAttribute("class", "menuitem-iconic");
					item.addEventListener('click', function(e) {
						PlacesUIUtils.showBookmarkDialog({
							'action': "edit",
							'type': "folder",
							'itemId': document.popupNode._id
							},  window);
					}, false);
					this.popup.appendChild(item);
				}
			break
			default:
				return false;
			break;
		}
		return true;
	},
	/* check for changes to our bookmarks.
	 * on change, change only the item
	 * else load menu
	 * version 1.5: added check to load menu only if some seconds have passes since last load (when importing or delete multiple bookmarks this hangs firefox for a while
	 */
	bmListener : {
		LOADINTERVAL : 5,
		CHECKINTERVAL : 3,
		oldId : 0,
		lastLoadedTs : 0,
		checkInt : 0,
		onItemAdded : function(id, aFolder, index) {this.oldId =0; this.check(id); },
		onItemMoved : function(id, aOldParent, aOldIndex, aNewParent, index) {this.oldId = 0; this.check(id)},
		onItemRemoved : function(id, aFolder, index) {this.oldId =0; this.check(id)},
		onItemChanged : function(id, aProperty, aIsAnnotationProperty, aValue) {
			//alert('change item '+id +' for '+ aProperty+' value '+aValue);
			this.oldId = id;
			bookmarksMenuAddon.changeItem(document.getElementById('bookmarksMenuAddonMainMenu'), id);
		},
		check : function(id) {
			var now = Math.floor(new Date().getTime() / 1000);
			if (this.oldId != id && (!this.lastLoadedTs || (now - this.lastLoadedTs > this.LOADINTERVAL) )) {
				this.oldId = id;
				this.lastLoadedTs = now;
				bookmarksMenuAddon.isLoaded = false;
				bookmarksMenuAddon.load();
			} else if (!this.checkInt && this.lastLoadedTs && now - this.lastLoadedTs < this.LOADINTERVAL)
				this.checkInt = window.setInterval(bookmarksMenuAddon.bmListener.checkLoad.bind(this), this.CHECKINTERVAL*1000);
		},
		checkLoad : function() {
			window.clearInterval(this.checkInt);
			var now = Math.floor(new Date().getTime() / 1000);
			this.checkInt = 0;

			if (now - this.lastLoadedTs > this.LOADINTERVAL) {
				this.lastLoadedTs = now;
				bookmarksMenuAddon.isLoaded = false;
				bookmarksMenuAddon.load();
			} else
				this.checkInt = window.setInterval(bookmarksMenuAddon.bmListener.checkLoad.bind(this), this.CHECKINTERVAL*1000);
		}
	},
	shutdown: function() {
		this.pref.removeObserver("", this);
		this.bmsvc.removeObserver(this.bmListener);
	},
	observe: function(subject, topic, data) {
		/* observe if options changed */
				 console.log(topic);
		if (topic != "nsPref:changed") {
			return;
		}
		var oldopt = this.hideOptions;
		var oldopt2 = this.showRecent;
		var oldopt3 = this.showTop;

		this.midBack = this.pref.getBoolPref("midBack");
		this.onoverOpen = this.pref.getBoolPref("onoverOpen");
		this.keepOpen = this.pref.getBoolPref("keepOpen");
		this.addOpenAll = this.pref.getBoolPref("addOpenAll");
		this.openNewTab = this.pref.getBoolPref("openNewTab");
		this.hideOptions = this.pref.getBoolPref("hideOptions");
		this.hideDelete = this.pref.getBoolPref("hideDelete");
		this.showRecent = this.pref.getBoolPref("showRecent");
		this.showTop = this.pref.getBoolPref("showTop");
		console.log(this.hideOptions);
		if (this.hideOptions != oldopt || this.showRecent != oldopt2 || this.showTop != oldopt3) {
			this.isLoaded = false;
			this.load();
		}

		switch(data)
		{
			case "query":
			case "toolbar":
			case "addOpenAll":
				this.isLoaded = false;
				this.load();
			break;
		}
	},
	addButtonAtFirstTime: function() {
		/* search if bookmarksMenu button is in toolbar */
		var navbar = document.getElementById("nav-bar");
		var toolbars = document.getElementsByTagName("toolbar");
		var found = false;
		var currentset = "", got;
		var i, l;
		for (i=0, l=toolbars.length; i < l; ++i) {
			if (toolbars[i].getAttribute("class").indexOf("chromeclass") != -1) {
				currentset = toolbars[i].currentSet;
				got = currentset.search(/bookmenu-button/g);
				if (got > -1) {
					found = true;
					break;
				}
			}
		}
		toolbars = null;
		
		if (!found && !navbar.getAttribute("collapsed")) {
			var menu = document.getElementById("bookmenu-button");
			var urlbar = document.getElementById("urlbar-container");
			navbar.insertItem("bookmenu-button", urlbar);
			currentset = navbar.currentSet;
			navbar.setAttribute("currentset", currentset);
			document.persist("nav-bar", "currentset");

			this.isLoaded = false;
			this.load();
		}
		this.pref.setBoolPref("firstTime", false);
	},
	/* recursive function to search a menuitem id
	* when find return false to exit loop
	*/
	changeItem: function(root, id) {
		for (var i = 0; i < root.childNodes.length; i++) {
			var title, item = root.childNodes[i];

			switch (item._type)
			{
				case 'folder':
					if (item._id == id) {
						title = this.bmsvc.getItemTitle(id);
						if (title.length > 45)
							title = title.substr(0, 45) + '...';

						item.setAttribute('label', title);
						item.setAttribute('tooltiptext', title);
						return false;
					}
					else if (!this.changeItem(item, id))
						break;
				break;

				case 'bookmark':
					if (item._id == id) {
						title = this.bmsvc.getItemTitle(id);
						if (title.length > 45)
							title = title.substr(0, 45) + '...';

						item.setAttribute('label', title);
						item._uri = this.bmsvc.getBookmarkURI(id).spec;
						item.setAttribute('tooltiptext', item._uri);
						var nsuri = this.ioService.newURI(item._uri, "", null);
						this.loadIcon(nsuri, item);
						return false;
					}
				break;
			}
		}
		return true;
	},
	domenu: function(rootNode, rootMenu, query, addOpen) {
		/* recursive function to create all menu items & all folders if any */
		var title;
		for (var i = 0; i < rootNode.childCount; i++) {
			var node = rootNode.getChild(i);

			if (node.type == node.RESULT_TYPE_FOLDER) {
				var menu = rootMenu.appendChild(document.createElement("menu"));
				title = node.title;
				if (title.length > 45)
					title = title.substr(0, 45) + '...';
				menu.setAttribute("class", "menu-iconic");
				menu.setAttribute("id", "menu-"+i);
				menu.setAttribute("label", title);
				menu.setAttribute("image", "chrome://custombutton/skin/folder.png");
				menu.setAttribute("tooltiptext", node.title);

				menu._id = node.itemId;
				menu._type = "folder";

				query.setFolders([node.itemId], 1);
				var subNode = this.historyService.executeQuery(query, this.options).root;
				subNode.containerOpen = true;
				var mp = document.createElement("menupopup");
				mp.setAttribute("contextmenu", "bookmarksMenuAddonPopup");
				this.domenu(subNode, menu.appendChild(mp), query, true);
			} else if (node.type == node.RESULT_TYPE_SEPARATOR) {
				var item = this.firefox.createElement("menuseparator");
				rootMenu.appendChild(item);
			} else if (node.type == node.RESULT_TYPE_URI) {
				var item = this.firefox.createElement("menuitem");
				rootMenu.appendChild(item);
				title = node.title ? node.title : node.uri;
				if (title.length > 45)
					title = title.substr(0, 45) + '...';
				item.setAttribute("label", title);
				item._uri = node.uri;
				item._id = node.itemId;
				item._type = "bookmark";

				item.setAttribute("class", "menuitem-iconic");
				if (!node.icon)
					item.setAttribute("image", this.faviconService.defaultFavicon.spec);
				else {
					var nsuri = this.ioService.newURI(node.uri, null, null);
					this.loadIcon(nsuri, item);
				}
				item.addEventListener('mouseover', function(e) {
						if (bookmarksMenuAddon.popup.state == 'open') {
							e.stopPropagation();
							return false;
						}
						//document.getElementById("statusbar-display").label = this._uri;
				}, false);

				item.setAttribute("tooltiptext", node.uri);
				item.setAttribute("_moz-location", node.uri);
				item.addEventListener('click', function(e) {
					if (e.button == 0) {
						var browser = bookmarksMenuAddon.firefox.getElementById("content");
						if (e.ctrlKey)
							bookmarksMenuAddon.firefox.getElementById("content").addTab(this._uri);
						else if (bookmarksMenuAddon.openNewTab)
							browser.selectedTab = browser.addTab(this._uri);
						else
							window._content.document.location = this._uri;
					} else if (e.button == 1) {
						if (bookmarksMenuAddon.midBack)
							bookmarksMenuAddon.firefox.getElementById("content").addTab(this._uri);
						else
							bookmarksMenuAddon.firefox.getElementById("content").loadOneTab(this._uri, null, null, null, false, null);

						//alert([bookmarksMenuAddon.keepOpen, bookmarksMenuAddon.keepOpen]);
						if (!bookmarksMenuAddon.keepOpen)
							bookmarksMenuAddon.firefox.getElementById("bookmarksMenuAddonMainMenu").hidePopup();
					}
				}, false);
			}
		}

		if (addOpen && this.addOpenAll && rootNode.childCount > 1) {
			var sep = this.firefox.createElement("menuseparator");
			rootMenu.appendChild(sep);
			var item = this.firefox.createElement("menuitem");
			item.setAttribute("label", "Open All in Tabs");
			item.setAttribute("tooltiptext", "Open All folder items in tabs");
			item.setAttribute("class", "menuitem-iconic");

			item.addEventListener('click', function(e) {
				if (e.button == 0) {
					var el = this.parentContainer.getElementsByTagName("menupopup")[0];
					//alert(parent.getElementsByTagName("menuitem").length);
					var i, c, a = new Array();
					for (i= 0; i < el.childNodes.length; i++) {
						c = el.childNodes[i];
						if (c._uri)
							a[a.length] = c._uri;
					}

					if (a.length)
						bookmarksMenuAddon.firefox.getElementById("content").loadTabs(a, true, true);
				}
			}, false);
			rootMenu.appendChild(item);
		}
	},
	loadIcon : function(uri, item) {
		this.faviconService.getFaviconURLForPage(uri, function(aURI) {
			if (aURI)
				item.setAttribute("image", aURI.spec);
			else
				item.setAttribute("image", this.faviconService.defaultFavicon.spec);
		});
	},
	load : function() {
		if (this.isLoaded)
				return;

		this.isLoaded = true;
		/* load preferences, search bookmarks and create menu */
		var toolbar = this.pref.getIntPref("toolbar");
		var squery = this.pref.getCharPref("query");
		if (!squery)
			squery = '';

		this.options.queryType = 1;
		this.options.expandQueries = true;
		var query = this.historyService.getNewQuery();
		var recentQuery = this.historyService.getNewQuery();

		var toolbarFolder = this.bmsvc.toolbarFolder;
		

		if (toolbar == 2 && squery.length)
			query.searchTerms = squery;
		else if (toolbar == 4) {
			this.options.excludeQueries = true;
			query.setFolders([this.bmsvc.bookmarksMenuFolder], 1);
		}
		else
			query.setFolders([toolbarFolder], 1);

		var result = this.historyService.executeQuery(query, this.options);

		var menu = this.firefox.getElementById("bookmarksMenuAddonMainMenu");
		console.log(this.hideOptions);
		if (menu) {
			/* empty it just in case */
			while (menu.firstChild)
				menu.removeChild(menu.firstChild);
			
			var rootNode = result.root;
			rootNode.containerOpen = true;

			/* new option (v 1.11 30/05) */
			if (toolbar == 4) {
				/* add b.toolbar first */
				var q2 = this.historyService.getNewQuery();
				q2.setFolders([toolbarFolder], 1);
				var res2 = this.historyService.executeQuery(q2, this.options);

				var rootNode2 = res2.root;
				rootNode2.containerOpen = true;
				var sep = this.firefox.createElement("menuseparator");
				menu.appendChild(sep);
				if (rootNode2.childCount) {
					var submenu = document.createElement("menu");
					submenu.setAttribute("class", "menu-iconic");
					submenu.setAttribute("label", "Bookmarks Toolbar");
					submenu.setAttribute("container", true);
					submenu.setAttribute("image", "chrome://custombutton/skin/bookmarksToolbar.png");
					submenu.setAttribute("tooltiptext", "Bookmarks Toolbar");
					menu.appendChild(submenu);

					var mp = document.createElement("menupopup");
					mp.setAttribute("contextmenu", "bookmarksMenuAddonPopup");
					this.domenu(rootNode2, submenu.appendChild(mp), query, false);
				}
				menu.appendChild(sep);
			}
			/* new option (v 1.19 22/07/14) */
			if (this.showRecent) {
				var options = this.historyService.getNewQueryOptions();
				var topQuery = this.historyService.getNewQuery();
				options.queryType = 1;
				options.sortingMode = 12;
				options.maxResults = 10;
				topQuery.setFolders([this.bmsvc.bookmarksMenuFolder,this.bmsvc.placesRoot,this.bmsvc.toolbarFolder], 3);

				var result = this.historyService.executeQuery(topQuery, options);
				console.log(result);
				var rootNode2 = result.root;
				rootNode2.containerOpen = true;
				if (rootNode2.childCount) {
					var submenu = document.createElement("menu");
					submenu.setAttribute("class", "menu-iconic");
					submenu.setAttribute("label", "Recently Bookmarked");
					submenu.setAttribute("container", true);
					submenu.setAttribute("image", "chrome://custombutton/skin/query-aero.png");
					submenu.setAttribute("tooltiptext", "Recently Bookmarked");
					submenu._type = 'special';
					menu.appendChild(submenu);

					var mp = document.createElement("menupopup");
					mp.setAttribute("contextmenu", "bookmarksMenuAddonPopup");
					this.domenu(rootNode2, submenu.appendChild(mp), topQuery, true);
				}
			}

			if (rootNode.childCount)
				this.domenu(rootNode, menu, query, false);

			/* new option (v 1.02 23/05) */
			if (toolbar == 3 && squery.length) {
				/* add search term as a submenu */
				var q2 = this.historyService.getNewQuery();
				q2.searchTerms = squery;
				var res2 = this.historyService.executeQuery(q2, this.options);

				var rootNode2 = res2.root;
				rootNode2.containerOpen = true;
				if (rootNode2.childCount) {

					var submenu = document.createElement("menu");
					submenu.setAttribute("class", "menu-iconic");
					submenu.setAttribute("label", squery);
					submenu.setAttribute("container", true);
					submenu.setAttribute("image", "chrome://custombutton/skin/folder.png");
					submenu.setAttribute("tooltiptext", squery);
					submenu._type = 'search';
					menu.appendChild(submenu);

					var mp = document.createElement("menupopup");
					mp.setAttribute("contextmenu", "bookmarksMenuAddonPopup");
					this.domenu(rootNode2, submenu.appendChild(mp), query, true);
				}
			}

			if (!this.hideOptions) {
				var item = this.firefox.createElement("menuseparator");
				menu.appendChild(item);

				item = this.firefox.createElement("menuitem");
				item.setAttribute("label", "Options");
				item.setAttribute("contextmenu", "bookmarksMenuAddonPopup");
				item.addEventListener('click', function(e) {
					window.openDialog(
						"chrome://custombutton/content/prefDialog.xul",
						"Bookmarks Menu",
						"chrome,centerscreen,dependent,minimizable,resizable");
				}, false);

				menu.appendChild(item);
			}

			rootNode.containerOpen = false;
		}
	},
	onover: function() {
		if (this.onoverOpen) {
			if (!this.isLoaded)
					this.load();
			var pop = document.getElementById('bookmarksMenuAddonMainMenu');
			var anchor = document.getElementById('bookmenu-button');
			pop.openPopup(anchor, 'after_start', 0, 0, false, false);
		}
	},
	onout: function(t, event) {
		var a = document.getElementById("addon-bar");
		var ar = a.getElementsByTagName("label");
		if (ar.length) {
			var l = ar[0];
			l.value = "";
		}

		/*if (this.onoverOpen) {
				pop.hidePopup();
		}*/
	},
	click: function(button, event) {
		/* open options dialog with middle click in toolbar button */
		if (!this.isLoaded) {
			this.load();
		}
		if (event.target == button && event.button == 1)
			window.openDialog(
				"chrome://custombutton/content/prefDialog.xul",
				"Bookmarks Menu",
				"chrome,centerscreen,dependent,minimizable,resizable");
	}
}

window.addEventListener("load",  function() {bookmarksMenuAddon.init();}, false);
window.addEventListener("unload", function() { bookmarksMenuAddon.shutdown(); }, false);
