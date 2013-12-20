/**
 * Created with JetBrains WebStorm.
 * User: manfred
 * Date: 12/20/13
 * Time: 9:42 PM
 * To change this template use File | Settings | File Templates.
 */


/*!
 * jQuery Swiper v1.0
 * Copyright (c) 2013 Manfred Grünling
 * No Licence yet, not published yet
 * Implements slide and swipe for touch-devices AND mouse-cursors
 * pointer is mousecurser or touch
 */

(function ($) {
    "use strict";
    $.fn.swiper = function () {
        //initialize
        var Pointer = {};                   // create an object, that will store all the pointer-data
        Pointer.down = false;               // Flag that tells whether a touch or mousclick is being pressed on the .swiper -container. (only one, at the same time, is possible)
        Pointer.move = false;               // Flag that tells whether a mousemove or touchmove is fired.. just to make 100% sure that not both events are fired the same time,
        Pointer.touchmove = false;          // if the touchmove event was triggered
        Pointer.posX = 0;                   // keeps track of the x-position of the pointer
        Pointer.posY = 0;                   // keeps track of the y-position of the pointer
        Pointer.speed = 0;                  // The speed of the pointer, after being pressed
        Pointer.lastMeasuredPosX = 0;       // The previous measured x-coordinate of the pointer (is measured in the setinterval loop)

        var threshold = 1;
        var that = this;
        var interval;
        // Initialize every element (this = .swiper)


        this.each(function () {
            $(this).wrap("<div class='swiper-wrapper'></div>");                 // This wrapper is used to scroll the slides. (overflow:scroll)  TODO: check if class already exists( better for no-js)
            $(this).children().wrap('<div class="swiper-slide"/>');
            displayBullets(this);
        });


        /*
         *  IE<=7 FIX
         *  IE<=7 do not interpret "display:table" correctly, but we rely on that.
         *  Solution: we change the DOM-elements and make real tables out of them
         *  <table class="swiper">
         *   <tr><td class="swiper-slide">Slide1<td>...</tr>
         *  </table>
         *  $.browser not working in jquery1.9
         */
        if (/MSIE (\d+\.\d+);/.test(navigator.userAgent)) {
            var ieversion = new Number(RegExp.$1);
            if (ieversion <= 7) {
                $(".swiper-slide").each(function () {
                    $(this).replaceWith("<td class='swiper-slide'>" + $(this).html() + "</td>");
                });
                $(".swiper").each(function () {
                    $(this).replaceWith("<table class='swiper'><tr>" + $(this).html() + "</tr></table>");
                });
                that = $(".swiper"); // get the newly created DOM-Elements again
            }
        }



        /*
         * Resize the SLIDES, and repositions the scroll-pos on window-resize
         * Each Slide will have the width of the ".swipper-wrapper"-container, which defines the width of the SWIPER-Area
         */
        $(window).on('resize', function () {
            var slideWidth = 0;                                                 // The width of each slide will be changed via js. So that each slide, always fills the width of its parent container ( kind of width: 100%)
            that.each(function () {
                slideWidth = $(this).parent().width();                          // swiper-wrapper width
                $(".swiper-slide", this).css('width', slideWidth);
                $(this).parent().scrollLeft(slideWidth * (getCurrentSlide(this))); //reposition slide

            });
        }).trigger('resize');                                                   //initially set the width of the image-containers to 100% width of the parent container


        /*
         * Inserts as many bullets as there are slides, into the DOM
         */
        function displayBullets(swipe) {
            var count = $(".swiper-slide", swipe).siblings().andSelf().length;  //$(swipe).children().length;
            var bullet_template = "<span class='current'></span>";
            var bullet = "";
            for (var i = 0; i < count; i++) {
                bullet = bullet + bullet_template;
            }
            //$(swipe).parent().after("<div class='swipa-nav'><div data-icon='<' class='swipa-left'></div><div class='swiper-bullets'>" + bullet + "</div><div data-icon='>' class='swipa-right'></div></div>");
            $(swipe).parent().after("<div class='swipa-nav'><div class='swiper-bullets'>" + bullet + "</div></div>");
            updateBullets(swipe);
        }


        /*
         * Updates the currently highlighted bullet
         */
        function updateBullets(swipe) {
            $(".swiper-bullets", $(swipe).parent().next()).children().removeClass("current").eq(getCurrentSlide(swipe)).addClass("current");
        }

        /*
         * Returts index of current slide
         */
        function getCurrentSlide(swipe) {
            var slideWidth = $(".swiper-slide:first", swipe).width();
            var currentScrollPos = $(swipe).parent().scrollLeft();                  // current horizontal position of the scroll bar
            return Math.round(currentScrollPos / slideWidth);
        }


        /*
         * if a mouse-click has happened on the swipe-field, start eventlistener for mousemovements
         * if a touch has happened, start eventlistener for touch-movements
         * Pointer.down =true makes sure, that only one eventlistener is triggered and not both
         */
        that.on("touchstart", function (e) {
            $(this).unbind('click', handler);                                                               //listen to click events, and follow the link
            //e.preventDefault();
            pointerDown(e.originalEvent.touches[0].pageX, e.originalEvent.touches[0].pageY);            // call pointerDown function with current touch-coordinates
            $(this).on("touchmove", function (touchEvent) {                                             // start listening to touchmove-events.
                touchEvent.preventDefault();                                                            // Android BUGFIX
                Pointer.move = true;                                                                    // Pointer.move = true is only in touchmove-eventhandler
                Pointer.touchmove = true;
                moveSlide(this, touchEvent.originalEvent.touches[0].pageX, touchEvent.originalEvent.touches[0].pageY);    // call moveSlide function with current touch-coordinates
            });
        }).on("mousedown", function (e) {
                $(this).unbind('click', handler);                                                           //listen to clicks on links.. if it is a click, without movement then follow the link. If its a movement, don't follow the link
                if (!Pointer.down) {                                                                        // if we have already detected a touchstart, no mousedown needs to be processed
                    e.preventDefault();
                    pointerDown(e.pageX, e.pageY);                                                          // call pointerDown function with current mouse-coordinates
                    $(this).on("mousemove", function (mouseEvent) {                                                  // activate mousemove-eventlistener
                        if (!Pointer.touchmove) {                                                           // touchmove == true means, that the move-event has already been triggered by a touch-event.. therefore we must not handle the mousemove-events again.
                            Pointer.move = true;
                            moveSlide(this, mouseEvent.pageX, mouseEvent.pageY);                                              // call moveSlide function with current mouse-coordinates
                        }
                    }).on("mouseleave", function (mouseEvent) {                                                  // activate mousemove-eventlistener
                            pointerUp(this);                                                            // Reset touch data..
                            snapToSlide(this);                                                          // snap the slide to closest side. (stay at current, or snap to next or previous slide)
                            $(this).off("mousemove").off("touchmove").off("mouseleave");                       // stop listening to movements
                        });
                }
            });


        /*
         *   OnMouseup or touchend
         */
        that.on("touchend", function (e) {
            if (Pointer.move == true) {
                e.preventDefault();                                                 // Dont follow the link, if the pointer was moving
            }
            pointerUp(this);                                                        // Reset touch data..
            snapToSlide(this);                                                      // snap the slide to closest side. (stay at current, or snap to next or previous slide)
        }).on("mouseup", function (e) {
                if (Pointer.move == true) {
                    $(this).bind('click', handler);                                      // Dont follow the link, if the pointer was moving
                }
                if (Pointer.down) {
                    pointerUp(this);                                                    // Reset touch data..
                    snapToSlide(this);                                                  // snap the slide to closest side. (stay at current, or snap to next or previous slide)
                }
            });


        //clicked links will not be opened!
        // thats needed, for movements on a linked field
        var handler = function (event) {
            event.preventDefault();
        }



        /*
         * Pointer down
         * Saves the current poiner position (Mouse or touch)
         * And starts the speed-calculation
         */
        function pointerDown(currentPointerX, currentPointerY) {
            Pointer.down = true;                                                    // Flag that we have already detected a "pointer-down". We have a touchdevice, no mousedown or mousemove needs to be detected
            Pointer.posX = currentPointerX;                                         // Save current x-coordinate of the touch
            Pointer.posY = currentPointerY;                                         // Save current y-coordinate of the touch
            interval = setInterval(calcSpeed, 1000 / 60);                           // start calculating the speed of the pointer movements  at a refresh-rate of  30FPS
        }

        /*
         * Pointer up
         * Reset values and stops speed-measurement
         */
        function pointerUp(swiperContainer) {
            Pointer.down = false;                                               // pointer has been lifted
            Pointer.move = false;                                               // no movement at all
            Pointer.touchmove = false;                                          // no movement on a touchdevice
            clearInterval(interval);                                            // stop calculation speed. not needed anymore
            $(swiperContainer).off("mousemove").off("touchmove").off("mouseleave");               // stop listening to movements
        }


        /*
         * After mousedown or touch on a slide, scroll it according to the current position of the pointer.
         */
        function moveSlide(wrapper, currentPointerX, currentPointerY) {
            var deltaX = Pointer.posX - currentPointerX;                        // calculate the horizontal distance the pointer has been moved, since last touchmove-event (not interval)
            var deltaY = Pointer.posY - currentPointerY;                        // calculate the vertical distance the pointer has been moved, since last touchmove-event (not interval)
            Pointer.posX = currentPointerX;                                     // update the current X Position
            if (Math.abs(deltaY) > Math.abs(deltaX)) {                          // Move the whole page vertically. We have to offer some verticall scrolling, because the native scrolling has been disabled.
                $(window).scrollTop($(window).scrollTop() + deltaY);            // ..., but in the css we have defined:  "touch-action: pan-y". So devices that support that command (e.g.: >IE10 mobile),  will handle vertical scrolling natively
            }
            var currentScrollPos = $(wrapper).parent().scrollLeft();            // current horizontal position of the scroll bar
            $(wrapper).parent().scrollLeft(currentScrollPos + deltaX);          // move the slides according to the offset (deltaX)
        }


        /*
         * This function slides the current slide to the left, right, or back to the current slide
         * If the slide has been moved over half of its width and the pointer has been released, the next/prev slide will be scrolled to.
         * If the slide was not moved over half of its width, the slide will move back to the current slide
         * If the pointer speed is faster then a threshold, on pointerup-event, the next/prev slide will be scrolled to
         */
        function snapToSlide(swiper) {
            var slideWidth = $(".swiper-slide:first", swiper).width();
            var currentScrollPos = $(swiper).parent().scrollLeft();                  // current horizontal position of the scroll bar
            var relativeScrollPos = currentScrollPos % slideWidth;                   // get ScrollPosition relative to each Slide
            var scrollTo = 0;
            if (relativeScrollPos < (slideWidth / 2)) {
                scrollTo = currentScrollPos - relativeScrollPos;
            }
            else {
                scrollTo = currentScrollPos - relativeScrollPos + slideWidth;
            }
            //if there was a swipe-interaction, then overwrite the scrollTo position and move the slides to the left or to the right
            if (Pointer.speed > threshold) {
                scrollTo = currentScrollPos - relativeScrollPos + slideWidth;
            }
            if (Pointer.speed < -threshold) {
                scrollTo = currentScrollPos - relativeScrollPos;
            }
            $(swiper).parent().animate({
                scrollLeft: scrollTo                                                // animate a scroll to the respective slide
            }, 200, function () {
                updateBullets(swiper);
            });

        }

        /*
         *  Calculates the "velocity" of the pointer.
         *  The velocity is basically the difference between last x-Coord and current x-Coord.
         *  Negative and positive velocity tell us in which direction the movement goes.
         */
        function calcSpeed() {
            Pointer.speed = Math.round(Pointer.lastMeasuredPosX - Pointer.posX);
            Pointer.lastMeasuredPosX = Pointer.posX;
        }


        /*
         *  Prevent images from being dragged
         */
        $(that).on('dragstart', function (event) { event.preventDefault(); });

        return this; //this ensures method calls can be chained, e.g.
    };

    // start
    $(function () {
        $(".swiper").swiper(); //self-initialization
    });

}(jQuery));
