

$(function(){
	nwK = new nwKiosk();
	nwK.setup();
	
	
	if (goKiosk) {
		nwK.goFull();
	}
	
	if (!hideMouse) {
		nwK.showMouse();
		(nwK.mouseHidden) ? $("html").css("cursor","none") : $("html").css("cursor","default") ;
		nwK.mouseHidden=!nwK.mouseHidden;
	}
});


var nwKiosk = function(){
	var mouseHidden =true;
	var kioskMode=true;
	var devTools=true;
	var gui =require('nw.gui');
	//setTimeout(focus_window,5000);

	var win = gui.Window.get();
	this.win = win;
	this.gui = gui;
	
	this.goFull = function(){
		win.enterKioskMode();
		$("html").css("cursor","none");
		kioskMode = true;
		mouseHidden = true;
	}
	
	this.setup = function(){$(document).keypress(function(d){
		switch(d.keyCode)
		{
		case 107:
		  (kioskMode) ? win.enterKioskMode() : win.leaveKioskMode() ;
		  kioskMode = !kioskMode;
		  break;
		case 109:
		  (mouseHidden) ? $("html").css("cursor","none") : $("html").css("cursor","default") ;
		  mouseHidden=!mouseHidden;
		  break;
		case 100:
		  (devTools) ? gui.Window.get().showDevTools() : gui.Window.get().closeDevTools();
		  devTools=!devTools;
		  break;
		}
		
		


	})}
	this.hideMouse = function(){
		$("body").css("cursor","none")
	}
	this.showMouse = function(){
		$("body").css("cursor","pointer")
	}
	
}