(function(define) {
// VideoCaption module.
    'use strict';

    define('video/09_video_caption.js',[
        'video/00_sjson.js',
        'video/00_async_process.js',
        'draggabilly',
        'edx-ui-toolkit/js/utils/string-utils',
        'edx-ui-toolkit/js/utils/html-utils',
        'modernizr',
        'afontgarde',
        'edxicons'
    ], function (Sjson, AsyncProcess, Draggabilly, StringUtils, HtmlUtils) {

        /**
         * @desc VideoCaption module exports a function.
         *
         * @type {function}
         * @access public
         *
         * @param {object} state - The object containing the state of the video
         *     player. All other modules, their parameters, public variables, etc.
         *     are available via this object.
         *
         * @this {object} The global window object.
         *
         * @returns {jquery Promise}
         */
        var VideoCaption = function (state) {
            if (!(this instanceof VideoCaption)) {
                return new VideoCaption(state);
            }

            _.bindAll(this, 'toggle', 'onMouseEnter', 'onMouseLeave', 'onMovement',
                'onContainerMouseEnter', 'onContainerMouseLeave', 'fetchCaption',
                'onResize', 'pause', 'play', 'onCaptionUpdate', 'onCaptionHandler', 'destroy',
                'handleKeypress', 'handleKeypressLink', 'openLanguageMenu', 'closeLanguageMenu',
                'previousLanguageMenuItem', 'nextLanguageMenuItem', 'handleCaptionToggle',
                'showClosedCaptions', 'hideClosedCaptions', 'toggleClosedCaptions',
                'updateCaptioningCookie', 'handleCaptioningCookie', 'handleTranscriptToggle',
                'listenForDragDrop'
            );
            this.state = state;
            this.state.videoCaption = this;
            this.renderElements();
            this.handleCaptioningCookie();
            this.listenForDragDrop();

            return $.Deferred().resolve().promise();
        };

        VideoCaption.prototype = {

            destroy: function () {
                this.state.el
                    .off({
                        'caption:fetch': this.fetchCaption,
                        'caption:resize': this.onResize,
                        'caption:update': this.onCaptionUpdate,
                        'ended': this.pause,
                        'fullscreen': this.onResize,
                        'pause': this.pause,
                        'play': this.play,
                        'destroy': this.destroy
                    })
                    .removeClass('is-captions-rendered');
                if (this.fetchXHR && this.fetchXHR.abort) {
                    this.fetchXHR.abort();
                }
                if (this.availableTranslationsXHR && this.availableTranslationsXHR.abort) {
                    this.availableTranslationsXHR.abort();
                }
                this.subtitlesEl.remove();
                this.container.remove();
                delete this.state.videoCaption;
            },
            /**
            * @desc Initiate rendering of elements, and set their initial configuration.
            *
            */
            renderElements: function () {
                var languages = this.state.config.transcriptLanguages;

                var langTemplate = [
                    '<div class="grouped-controls">',
                        '<button class="control toggle-captions" aria-disabled="false">',
                            '<span class="icon-fallback-img">',
                                '<span class="icon fa fa-cc" aria-hidden="true"></span>',
                                '<span class="sr control-text"></span>',
                            '</span>',
                        '</button>',
                        '<button class="control toggle-transcript" aria-disabled="false">',
                            '<span class="icon-fallback-img">',
                                '<span class="icon fa fa-quote-left" aria-hidden="true"></span>',
                                '<span class="sr control-text"></span>',
                            '</span>',
                        '</button>',
                        '<div class="lang menu-container" role="application">',
                            '<p class="sr instructions" id="lang-instructions"></p>',
                            '<button class="control language-menu" aria-disabled="false"',
                                'aria-describedby="lang-instructions" ',
                                'title="',
                                    gettext('Open language menu'),
                                '">',
                                '<span class="icon-fallback-img">',
                                    '<span class="icon fa fa-caret-left" aria-hidden="true"></span>',
                                    '<span class="sr control-text"></span>',
                                '</span>',
                            '</button>',
                        '</div>',
                    '</div>'
                ].join('');

                var template = edx.HtmlUtils.interpolateHtml(
                        edx.HtmlUtils.HTML([
                            '<div class="subtitles" role="region" id="transcript-{courseId}">',
                                '<h3 id="transcript-label-{courseId}" class="transcript-title sr"></h3>',
                                '<ol id="transcript-captions" class="subtitles-menu" lang="{courseLang}"></ol>',
                            '</div>'
                        ].join('')),
                        {
                            courseId: this.state.id,
                            courseLang: this.state.lang
                        }
                    ).toString();

                this.loaded = false;
                this.subtitlesEl = $(template);
                this.subtitlesMenuEl = this.subtitlesEl.find('.subtitles-menu');
                this.container = $(langTemplate);
                this.captionControlEl = this.container.find('.toggle-captions');
                this.captionDisplayEl = this.state.el.find('.closed-captions');
                this.transcriptControlEl = this.container.find('.toggle-transcript');
                this.languageChooserEl = this.container.find('.lang');
                this.menuChooserEl = this.languageChooserEl.parent();

                if (_.keys(languages).length) {
                    this.renderLanguageMenu(languages);
                    this.fetchCaption();
                }
            },

            /**
            * @desc Bind any necessary function callbacks to DOM events (click,
            *     mousemove, etc.).
            *
            */
            bindHandlers: function () {
                var state = this.state,
                    events = [
                        'mouseover', 'mouseout', 'mousedown', 'click', 'focus', 'blur',
                        'keydown'
                    ].join(' ');

                this.captionControlEl.on({
                    click: this.toggleClosedCaptions,
                    keydown: this.handleCaptionToggle
                });
                this.transcriptControlEl.on({
                    click: this.toggle,
                    keydown: this.handleTranscriptToggle
                });
                this.subtitlesMenuEl.on({
                    mouseenter: this.onMouseEnter,
                    mouseleave: this.onMouseLeave,
                    mousemove: this.onMovement,
                    mousewheel: this.onMovement,
                    DOMMouseScroll: this.onMovement
                })
                .on(events, 'li[data-index]', this.onCaptionHandler);
                this.container.on({
                    mouseenter: this.onContainerMouseEnter,
                    mouseleave: this.onContainerMouseLeave
                });

                if (this.showLanguageMenu) {
                    this.languageChooserEl.on({
                        keydown: this.handleKeypress
                    }, '.language-menu');

                    this.languageChooserEl.on({
                        keydown: this.handleKeypressLink
                    }, '.control-lang');
                }

                state.el
                    .on({
                        'caption:fetch': this.fetchCaption,
                        'caption:resize': this.onResize,
                        'caption:update': this.onCaptionUpdate,
                        'ended': this.pause,
                        'fullscreen': this.onResize,
                        'pause': this.pause,
                        'play': this.play,
                        'destroy': this.destroy
                    });

                if ((state.videoType === 'html5') && (state.config.autohideHtml5)) {
                    this.subtitlesMenuEl.on('scroll', state.videoControl.showControls);
                }
            },

            onCaptionUpdate: function (event, time) {
                this.updatePlayTime(time);
            },

            handleCaptionToggle: function(event) {
                var KEY = $.ui.keyCode,
                    keyCode = event.keyCode;

                switch(keyCode) {
                    case KEY.SPACE:
                    case KEY.ENTER:
                        event.preventDefault();
                        this.toggleClosedCaptions(event);
                }
            },

            handleTranscriptToggle: function(event) {
                var KEY = $.ui.keyCode,
                    keyCode = event.keyCode;

                switch(keyCode) {
                    case KEY.SPACE:
                    case KEY.ENTER:
                        event.preventDefault();
                        this.toggle(event);
                }
            },

            handleKeypressLink: function(event) {
                var KEY = $.ui.keyCode,
                    keyCode = event.keyCode,
                    focused, index, total;

                switch(keyCode) {
                    case KEY.UP:
                        event.preventDefault();
                        focused = $(':focus').parent();
                        index = this.languageChooserEl.find('li').index(focused);
                        total = this.languageChooserEl.find('li').size() - 1;

                        this.previousLanguageMenuItem(event, index);
                        break;

                    case KEY.DOWN:
                        event.preventDefault();
                        focused = $(':focus').parent();
                        index = this.languageChooserEl.find('li').index(focused);
                        total = this.languageChooserEl.find('li').size() - 1;

                        this.nextLanguageMenuItem(event, index, total);
                        break;

                    case KEY.ESCAPE:
                        this.closeLanguageMenu(event);
                        break;

                    case KEY.ENTER:
                    case KEY.SPACE:
                        return true;
                }
            },

            handleKeypress: function(event) {
                var KEY = $.ui.keyCode,
                    keyCode = event.keyCode;

                switch(keyCode) {
                    // Handle keypresses
                    case KEY.ENTER:
                    case KEY.SPACE:
                    case KEY.UP:
                        event.preventDefault();
                        this.openLanguageMenu(event);
                        break;

                    case KEY.ESCAPE:
                        this.closeLanguageMenu(event);
                        break;
                }

                return event.keyCode === KEY.TAB;
            },

            nextLanguageMenuItem: function(event, index, total) {
                event.preventDefault();

                if (event.altKey || event.shiftKey) {
                    return true;
                }

                if (index === total) {
                    this.languageChooserEl
                        .find('.control-lang').first()
                            .focus();
                } else {
                    this.languageChooserEl
                        .find('li:eq(' + index + ')')
                        .next()
                            .find('.control-lang')
                                .focus();
                }

                return false;
            },

            previousLanguageMenuItem: function(event, index) {
                event.preventDefault();

                if (event.altKey || event.shiftKey) {
                    return true;
                }

                if (index === 0) {
                    this.languageChooserEl
                        .find('.control-lang').last()
                        .focus();
                } else {
                    this.languageChooserEl
                        .find('li:eq(' + index + ')')
                        .prev()
                            .find('.control-lang')
                            .focus();
                }

                return false;
            },

            openLanguageMenu: function(event) {
                event.preventDefault();

                var button = this.languageChooserEl,
                    menu = button.parent().find('.menu');

                button
                    .addClass('is-opened');

                menu
                    .find('.control-lang').last()
                        .focus();
            },

            closeLanguageMenu: function(event) {
                event.preventDefault();

                var button = this.languageChooserEl;

                button
                    .removeClass('is-opened')
                    .find('.language-menu')
                        .focus();
            },

            onCaptionHandler: function (event) {
                switch (event.type) {
                    case 'mouseover':
                    case 'mouseout':
                        this.captionMouseOverOut(event);
                        break;
                    case 'mousedown':
                        this.captionMouseDown(event);
                        break;
                    case 'click':
                        this.captionClick(event);
                        break;
                    case 'focusin':
                        this.captionFocus(event);
                        break;
                    case 'focusout':
                        this.captionBlur(event);
                        break;
                    case 'keydown':
                        this.captionKeyDown(event);
                        break;
                }
            },

            /**
            * @desc Opens language menu.
            *
            * @param {jquery Event} event
            */
            onContainerMouseEnter: function (event) {
                event.preventDefault();
                $(event.currentTarget).find('.lang').addClass('is-opened');

                // We only want to fire the analytics event if a menu is
                // present instead of on the container hover, since it wraps
                // the "CC" and "Transcript" buttons as well.
                if ($(event.currentTarget).find('.lang').length) {
                    this.state.el.trigger('language_menu:show');
                }
            },

            /**
            * @desc Closes language menu.
            *
            * @param {jquery Event} event
            */
            onContainerMouseLeave: function (event) {
                event.preventDefault();
                $(event.currentTarget).find('.lang').removeClass('is-opened');

                // We only want to fire the analytics event if a menu is
                // present instead of on the container hover, since it wraps
                // the "CC" and "Transcript" buttons as well.
                if ($(event.currentTarget).find('.lang').length) {
                    this.state.el.trigger('language_menu:hide');
                }
            },

            /**
            * @desc Freezes moving of captions when mouse is over them.
            *
            * @param {jquery Event} event
            */
            onMouseEnter: function () {
                if (this.frozen) {
                    clearTimeout(this.frozen);
                }

                this.frozen = setTimeout(
                    this.onMouseLeave,
                    this.state.config.captionsFreezeTime
                );
            },

            /**
            * @desc Unfreezes moving of captions when mouse go out.
            *
            * @param {jquery Event} event
            */
            onMouseLeave: function () {
                if (this.frozen) {
                    clearTimeout(this.frozen);
                }

                this.frozen = null;

                if (this.playing) {
                    this.scrollCaption();
                }
            },

            /**
            * @desc Freezes moving of captions when mouse is moving over them.
            *
            * @param {jquery Event} event
            */
            onMovement: function () {
                this.onMouseEnter();
            },

            /**
             * @desc Gets the correct start and end times from the state configuration
             *
             * @returns {array} if [startTime, endTime] are defined
             */
            getStartEndTimes: function () {
                // due to the way config.startTime/endTime are
                // processed in 03_video_player.js, we assume
                // endTime can be an integer or null,
                // and startTime is an integer > 0
                var config = this.state.config;
                var startTime = config.startTime * 1000;
                var endTime = (config.endTime !== null) ? config.endTime * 1000 : null;
                return [startTime, endTime];
            },

            /**
             * @desc Gets captions within the start / end times stored within this.state.config
             *
             * @returns {object} {start, captions} parallel arrays of
             *    start times and corresponding captions
             */
            getBoundedCaptions: function () {
                // get start and caption. If startTime and endTime
                // are specified, filter by that range.
                var times = this.getStartEndTimes();
                var results = this.sjson.filter.apply(this.sjson, times);
                var start = results.start;
                var captions = results.captions;

                return {
                  'start': start,
                  'captions': captions
                };
            },

            /**
            * @desc Fetch the caption file specified by the user. Upon successful
            *     receipt of the file, the captions will be rendered.
            * @param {boolean} [fetchWithYoutubeId] Fetch youtube captions if true.
            * @returns {boolean}
            *     true: The user specified a caption file. NOTE: if an error happens
            *         while the specified file is being retrieved (for example the
            *         file is missing on the server), this function will still return
            *         true.
            *     false: No caption file was specified, or an empty string was
            *         specified for the Youtube type player.
            */
            fetchCaption: function (fetchWithYoutubeId) {
                var self = this,
                    state = this.state,
                    language = state.getCurrentLanguage(),
                    url = state.config.transcriptTranslationUrl.replace('__lang__', language),
                    data, youtubeId;

                if (this.loaded) {
                    this.hideCaptions(false);
                }

                if (this.fetchXHR && this.fetchXHR.abort) {
                    this.fetchXHR.abort();
                }

                if (state.videoType === 'youtube' || fetchWithYoutubeId) {
                    try {
                        youtubeId = state.youtubeId('1.0');
                    } catch (err) {
                        youtubeId = null;
                    }

                    if (!youtubeId) {
                        return false;
                    }

                    data = {videoId: youtubeId};
                }

                state.el.removeClass('is-captions-rendered');
                // Fetch the captions file. If no file was specified, or if an error
                // occurred, then we hide the captions panel, and the "Transcript" button
                this.fetchXHR = $.ajaxWithPrefix({
                    url: url,
                    notifyOnError: false,
                    data: data,
                    success: function (sjson) {
                        self.sjson = new Sjson(sjson);
                        var results = self.getBoundedCaptions();
                        var start = results.start;
                        var captions = results.captions;

                        if (self.loaded) {
                            if (self.rendered) {
                                self.renderCaption(start, captions);
                                self.updatePlayTime(state.videoPlayer.currentTime);
                            }
                        } else {
                            if (state.isTouch) {
                                edx.HtmlUtils.setHtml(
                                    self.subtitlesEl.find('.subtitles.menu'),
                                    edx.HtmlUtils.joinHtml(
                                        edx.HtmlUtils.HTML('<li>'),
                                        gettext('Transcript will be displayed when you start playing the video.'),
                                        edx.HtmlUtils.HTML('</li>')
                                    )
                                );
                            } else {
                                self.renderCaption(start, captions);
                            }
                            self.hideCaptions(state.hide_captions, false);
                            edx.HtmlUtils.append(
                                self.state.el.find('.video-wrapper').parent(),
                                edx.HtmlUtils.HTML(self.subtitlesEl)
                            );
                            edx.HtmlUtils.append(
                                self.state.el.find('.secondary-controls'),
                                edx.HtmlUtils.HTML(self.container)
                            );
                            self.bindHandlers();
                        }

                        self.loaded = true;
                    },
                    error: function (jqXHR, textStatus, errorThrown) {
                        console.log('[Video info]: ERROR while fetching captions.');
                        console.log(
                            '[Video info]: STATUS:', textStatus +
                            ', MESSAGE:', '' + errorThrown
                        );
                        // If initial list of languages has more than 1 item, check
                        // for availability other transcripts.
                        // If player mode is html5 and there are no initial languages
                        // then try to fetch youtube version of transcript with
                        // youtubeId.
                        if (_.keys(state.config.transcriptLanguages).length > 1) {
                            self.fetchAvailableTranslations();
                        } else if (!fetchWithYoutubeId && state.videoType === 'html5') {
                            console.log('[Video info]: Html5 mode fetching caption with youtubeId.');
                            self.fetchCaption(true);
                        } else {
                            self.hideCaptions(true, false);
                            self.state.el.find('.lang').hide();
                            self.state.el.find('.transcript-control').hide();
                            self.subtitlesEl.hide();
                        }
                    }
                });

                return true;
            },

            /**
            * @desc Fetch the list of available translations. Upon successful receipt,
            *    the list of available translations will be updated.
            *
            * @returns {jquery Promise}
            */
            fetchAvailableTranslations: function () {
                var self = this,
                    state = this.state;

                this.availableTranslationsXHR = $.ajaxWithPrefix({
                    url: state.config.transcriptAvailableTranslationsUrl,
                    notifyOnError: false,
                    success: function (response) {
                        var currentLanguages = state.config.transcriptLanguages,
                            newLanguages = _.pick(currentLanguages, response);

                        // Update property with available currently translations.
                        state.config.transcriptLanguages = newLanguages;
                        // Remove an old language menu.
                        self.container.find('.langs-list').remove();

                        if (_.keys(newLanguages).length) {
                            // And try again to fetch transcript.
                            self.fetchCaption();
                            self.renderLanguageMenu(newLanguages);
                        }
                    },
                    error: function () {
                        self.hideCaptions(true, false);
                        self.state.el.find('.lang').hide();
                        self.state.el.find('.transcript-control').hide();
                        self.subtitlesEl.hide();
                    }
                });

                return this.availableTranslationsXHR;
            },

            /**
            * @desc Recalculates and updates the height of the container of captions.
            *
            */
            onResize: function () {
                this.subtitlesEl
                    .find('.spacing').first()
                        .height(this.topSpacingHeight());

                this.subtitlesEl
                    .find('.spacing').last()
                        .height(this.bottomSpacingHeight());

                this.scrollCaption();
                this.setSubtitlesHeight();
            },

            /**
            * @desc Create any necessary DOM elements, attach them, and set their
            *     initial configuration for the Language menu.
            *
            * @param {object} languages Dictionary where key is language code,
            *     value - language label
            *
            */
            renderLanguageMenu: function (languages) {
                var self = this,
                    state = this.state,
                    menu = $('<ol class="langs-list menu">'),
                    currentLang = state.getCurrentLanguage(),
                    li, liObj,
                    link, linkObj;

                if (_.keys(languages).length < 2) {
                    // Remove the menu toggle button
                    self.container.find('.lang').remove();
                    return false;
                }

                this.showLanguageMenu = true;

                $.each(languages, function(code, label) {
                    li = edx.HtmlUtils.interpolateHtml(
                        edx.HtmlUtils.HTML(
                            '<li data-lang-code="{code}" />'
                        ),
                        {
                            code: code
                        }
                    ).toString();
                    
                    link = edx.HtmlUtils.interpolateHtml(
                        edx.HtmlUtils.HTML(
                            '<button class="control control-lang" aria-pressed="false">{label}</button>'
                        ),
                        {
                            label: label
                        }
                    ).toString();
                    
                    liObj = $.parseHTML(li);
                    linkObj = $.parseHTML(link);

                    if (currentLang === code) {
                        $(liObj).addClass('is-active');
                        $(linkObj).attr('aria-pressed', 'true');
                    }

                    edx.HtmlUtils.append(
                        $(liObj),
                        edx.HtmlUtils.HTML(linkObj)
                    );
                    
                    edx.HtmlUtils.append(
                        menu,
                        edx.HtmlUtils.HTML(liObj)
                    );
                });
                
                edx.HtmlUtils.append(
                    this.languageChooserEl,
                    edx.HtmlUtils.HTML(menu)
                );

                menu.on('click', '.control-lang', function (e) {
                    var el = $(e.currentTarget).parent(),
                        state = self.state,
                        langCode = el.data('lang-code');

                    if (state.lang !== langCode) {
                        state.lang = langCode;
                        el  .addClass('is-active')
                            .siblings('li')
                            .removeClass('is-active')
                            .find('.control-lang')
                            .attr('aria-pressed', 'false');
                            
                        $(e.currentTarget).attr('aria-pressed', 'true');

                        state.el.trigger('language_menu:change', [langCode]);
                        self.fetchCaption();
                        
                        // update the closed-captions lang attribute
                        self.captionDisplayEl.attr('lang', langCode);
                        
                        // update the transcript lang attribute
                        self.subtitlesMenuEl.attr('lang', langCode);
                        self.closeLanguageMenu(e);
                    }
                });
            },

            /**
            * @desc Create any necessary DOM elements, attach them, and set their
            *     initial configuration.
            *
            * @param {jQuery element} container Element in which captions will be
            *     inserted.
            * @param {array} start List of start times for the video.
            * @param {array} captions List of captions for the video.
            * @returns {object} jQuery's Promise object
            *
            */
            buildCaptions: function  (container, start, captions) {
                var process = function(text, index) {
                        var liEl = $('<li>', {
                            'role': 'link',
                            'data-index': index,
                            'data-start': start[index],
                            'tabindex': 0
                        });
                        
                        $(liEl).text(text);

                        return liEl[0];
                    };

                return AsyncProcess.array(captions, process).done(function (list) {
                    edx.HtmlUtils.append(
                        container,
                        edx.HtmlUtils.HTML(list)
                    );
                });
            },

            /**
            * @desc Initiates creating of captions and set their initial configuration.
            *
            * @param {array} start List of start times for the video.
            * @param {array} captions List of captions for the video.
            *
            */
            renderCaption: function (start, captions) {
                var self = this;

                var onRender = function () {
                    self.addPaddings();
                    // Enables or disables automatic scrolling of the captions when the
                    // video is playing. This feature has to be disabled when tabbing
                    // through them as it interferes with that action. Initially, have
                    // this flag enabled as we assume mouse use. Then, if the first
                    // caption (through forward tabbing) or the last caption (through
                    // backwards tabbing) gets the focus, disable that feature.
                    // Re-enable it if tabbing then cycles out of the the captions.
                    self.autoScrolling = true;
                    // Keeps track of where the focus is situated in the array of
                    // captions. Used to implement the automatic scrolling behavior and
                    // decide if the outline around a caption has to be hidden or shown
                    // on a mouseenter or mouseleave. Initially, no caption has the
                    // focus, set the index to -1.
                    self.currentCaptionIndex = -1;
                    // Used to track if the focus is coming from a click or tabbing. This
                    // has to be known to decide if, when a caption gets the focus, an
                    // outline has to be drawn (tabbing) or not (mouse click).
                    self.isMouseFocus = false;
                    self.rendered = true;
                    self.state.el.addClass('is-captions-rendered');

                    self.subtitlesEl
                        .attr('aria-label', gettext('Activating a link in this group will skip to the corresponding point in the video.')); // jshint ignore:line

                    self.subtitlesEl.find('.transcript-title')
                        .text(gettext('Video transcript'));

                    self.subtitlesEl.find('.transcript-start')
                        .text(gettext('Start of transcript. Skip to the end.'))
                        .attr('lang', $('html').attr('lang'));

                    self.subtitlesEl.find('.transcript-end')
                        .text(gettext('End of transcript. Skip to the start.'))
                        .attr('lang', $('html').attr('lang'));

                    self.container.find('.menu-container .instructions')
                        .text(gettext('Press the UP arrow key to enter the language menu then use UP and DOWN arrow keys to navigate language options. Press ENTER to change to the selected language.')); // jshint ignore:line

                    self.container.find('.menu-container .control .control-text')
                        .text(gettext('Open language menu.'));
                };

                this.rendered = false;
                this.subtitlesMenuEl.empty();
                this.setSubtitlesHeight();
                this.buildCaptions(this.subtitlesMenuEl, start, captions).done(onRender);
            },

            /**
            * @desc Sets top and bottom spacing height and make sure they are taken
            *     out of the tabbing order.
            *
            */
            addPaddings: function() {
                var topSpacer = edx.HtmlUtils.interpolateHtml(
                        edx.HtmlUtils.HTML([
                            '<li class="spacing" style="height: {height}px">',
                                '<a href="#transcript-end-{id}" id="transcript-start-{id}" class="transcript-start"></a>',
                            '</li>'
                        ].join('')),
                        {
                            id: this.state.id,
                            height: this.topSpacingHeight()
                        }
                    ).toString();

                var bottomSpacer = edx.HtmlUtils.interpolateHtml(
                        edx.HtmlUtils.HTML([
                            '<li class="spacing" style="height: {height}px">',
                                '<a href="#transcript-start-{id}" id="transcript-end-{id}" class="transcript-end"></a>',
                            '</li>'
                        ].join('')),
                        {
                            id: this.state.id,
                            height: this.bottomSpacingHeight()
                        }
                    ).toString();

                edx.HtmlUtils.prepend(
                    this.subtitlesMenuEl,
                    edx.HtmlUtils.HTML(
                        topSpacer
                    )
                );
                
                edx.HtmlUtils.append(
                    this.subtitlesMenuEl,
                    edx.HtmlUtils.HTML(
                        bottomSpacer
                    )
                );
            },

            /**
            * @desc
            * On mouseOver: Hides the outline of a caption that has been tabbed to.
            * On mouseOut: Shows the outline of a caption that has been tabbed to.
            *
            * @param {jquery Event} event
            *
            */
            captionMouseOverOut: function (event) {
                var caption = $(event.target),
                    captionIndex = parseInt(caption.attr('data-index'), 10);

                if (captionIndex === this.currentCaptionIndex) {
                    if (event.type === 'mouseover') {
                        caption.removeClass('focused');
                    }
                    else { // mouseout
                        caption.addClass('focused');
                    }
                }
            },

            /**
            * @desc Handles mousedown event on concrete caption.
            *
            * @param {jquery Event} event
            *
            */
            captionMouseDown: function (event) {
                var caption = $(event.target);

                this.isMouseFocus = true;
                this.autoScrolling = true;
                caption.removeClass('focused');
                this.currentCaptionIndex = -1;
            },

            /**
            * @desc Handles click event on concrete caption.
            *
            * @param {jquery Event} event
            *
            */
            captionClick: function (event) {
                this.seekPlayer(event);
            },

            /**
            * @desc Handles focus event on concrete caption.
            *
            * @param {jquery Event} event
            *
            */
            captionFocus: function (event) {
                var caption = $(event.target),
                    captionIndex = parseInt(caption.attr('data-index'), 10);
                // If the focus comes from a mouse click, hide the outline, turn on
                // automatic scrolling and set currentCaptionIndex to point outside of
                // caption list (ie -1) to disable mouseenter, mouseleave behavior.
                if (this.isMouseFocus) {
                    this.autoScrolling = true;
                    caption.removeClass('focused');
                    this.currentCaptionIndex = -1;
                }
                // If the focus comes from tabbing, show the outline and turn off
                // automatic scrolling.
                else {
                    this.currentCaptionIndex = captionIndex;
                    caption.addClass('focused');
                    // The second and second to last elements turn automatic scrolling
                    // off again as it may have been enabled in captionBlur.
                    if (
                        captionIndex <= 1 ||
                        captionIndex >= this.sjson.getSize() - 2
                    ) {
                        this.autoScrolling = false;
                    }
                }
            },

            /**
            * @desc Handles blur event on concrete caption.
            *
            * @param {jquery Event} event
            *
            */
            captionBlur: function (event) {
                var caption = $(event.target),
                    captionIndex = parseInt(caption.attr('data-index'), 10);

                caption.removeClass('focused');
                // If we are on first or last index, we have to turn automatic scroll
                // on again when losing focus. There is no way to know in what
                // direction we are tabbing. So we could be on the first element and
                // tabbing back out of the captions or on the last element and tabbing
                // forward out of the captions.
                if (captionIndex === 0 ||
                    captionIndex === this.sjson.getSize() - 1) {

                    this.autoScrolling = true;
                }
            },

            /**
            * @desc Handles keydown event on concrete caption.
            *
            * @param {jquery Event} event
            *
            */
            captionKeyDown: function (event) {
                this.isMouseFocus = false;
                if (event.which === 13) { //Enter key
                    this.seekPlayer(event);
                }
            },

            /**
            * @desc Scrolls caption container to make active caption visible.
            *
            */
            scrollCaption: function () {
                var el = this.subtitlesEl.find('.current:first');

                // Automatic scrolling gets disabled if one of the captions has
                // received focus through tabbing.
                if (
                    !this.frozen &&
                    el.length &&
                    this.autoScrolling
                ) {
                    this.subtitlesEl.scrollTo(
                        el,
                        {
                            offset: -1 * this.calculateOffset(el)
                        }
                    );
                }
            },

            /**
            * @desc Updates flags on play
            *
            */
            play: function () {
                var captions, startAndCaptions, start;
                if (this.loaded) {
                    if (!this.rendered) {
                        startAndCaptions = this.getBoundedCaptions();
                        start = startAndCaptions.start;
                        captions = startAndCaptions.captions;
                        this.renderCaption(start, captions);
                    }

                    this.playing = true;
                }
            },

            /**
            * @desc Updates flags on pause
            *
            */
            pause: function () {
                if (this.loaded) {
                    this.playing = false;
                }
            },

            /**
            * @desc Updates captions UI on paying.
            *
            * @param {number} time Time in seconds.
            *
            */
            updatePlayTime: function (time) {
                var state = this.state,
                    params, newIndex;

                if (this.loaded) {
                    if (state.isFlashMode()) {
                        time = Time.convert(time, state.speed, '1.0');
                    }

                    time = Math.round(time * 1000 + 100);
                    var times = this.getStartEndTimes();
                    // if start and end times are defined, limit search.
                    // else, use the entire list of video captions
                    params = [time].concat(times);
                    newIndex = this.sjson.search.apply(this.sjson, params);

                    if (
                        typeof newIndex !== 'undefined' &&
                        newIndex !== -1 &&
                        this.currentIndex !== newIndex
                    ) {
                        if (typeof this.currentIndex !== 'undefined') {
                            this.subtitlesEl
                                .find('li.current')
                                .removeClass('current');
                        }

                        this.subtitlesEl
                            .find("li[data-index='" + newIndex + "']")
                            .addClass('current');

                        this.currentIndex = newIndex;
                        this.captionDisplayEl.text(this.subtitlesEl.find("li[data-index='" + newIndex + "']").text());
                        this.scrollCaption();
                    }
                }
            },

            /**
            * @desc Sends log to the server on caption seek.
            *
            * @param {jquery Event} event
            *
            */
            seekPlayer: function (event) {
                var state = this.state,
                    time = parseInt($(event.target).data('start'), 10);

                if (state.isFlashMode()) {
                    time = Math.round(Time.convert(time, '1.0', state.speed));
                }

                state.trigger(
                    'videoPlayer.onCaptionSeek',
                    {
                        'type': 'onCaptionSeek',
                        'time': time/1000
                    }
                );

                event.preventDefault();
            },

            /**
            * @desc Calculates offset for paddings.
            *
            * @param {jquery element} element Top or bottom padding element.
            * @returns {number} Offset for the passed padding element.
            *
            */
            calculateOffset: function (element) {
                return this.captionHeight() / 2 - element.height() / 2;
            },

            /**
            * @desc Calculates offset for the top padding element.
            *
            * @returns {number} Offset for the passed top padding element.
            *
            */
            topSpacingHeight: function () {
                return this.calculateOffset(
                    this.subtitlesEl.find('li:not(.spacing)').first()
                );
            },

            /**
            * @desc Calculates offset for the bottom padding element.
            *
            * @returns {number} Offset for the passed bottom padding element.
            *
            */
            bottomSpacingHeight: function () {
                return this.calculateOffset(
                    this.subtitlesEl.find('li:not(.spacing)').last()
                );
            },

            /**
            * @desc Shows/Hides transcript on click `transcript` button
            *
            * @param {jquery Event} event
            *
            */
            toggle: function (event) {
                event.preventDefault();

                if (this.state.el.hasClass('closed')) {
                    this.hideCaptions(false, true, true);
                } else {
                    this.hideCaptions(true, true, true);
                }
            },

            handleCaptioningCookie: function() {
                if ($.cookie('show_closed_captions') === 'true') {
                    this.state.showClosedCaptions = true;
                    this.showClosedCaptions();

                    // keep it going until turned off
                    $.cookie('show_closed_captions', 'true', {
                        expires: 3650,
                        path: '/'
                    });
                } else {
                    this.hideClosedCaptions();
                }
            },

            toggleClosedCaptions: function(event) {
                event.preventDefault();

                if (this.state.el.hasClass('has-captions')) {
                    this.state.showClosedCaptions = false;
                    this.updateCaptioningCookie(false);
                    this.hideClosedCaptions();
                } else {
                    this.state.showClosedCaptions = true;
                    this.updateCaptioningCookie(true);
                    this.showClosedCaptions();
                }
            },

            showClosedCaptions: function() {
                this.state.el.addClass('has-captions');

                this.captionDisplayEl
                    .show()
                    .addClass('is-visible')
                    .attr('lang', this.state.lang);

                this.captionControlEl
                    .addClass('is-active')
                    .attr('title', gettext('Hide closed captions'))
                    .find('.control-text')
                        .text(gettext('Hide closed captions'));

                if (this.subtitlesEl.find('.current').text()) {
                    this.captionDisplayEl
                        .text(this.subtitlesEl.find('.current').text());
                } else {
                    this.captionDisplayEl
                        .text(gettext('(Caption will be displayed when you start playing the video.)'));
                }
                
                this.state.el.trigger('captions:show');
            },

            hideClosedCaptions: function() {
                this.state.el.removeClass('has-captions');

                this.captionDisplayEl
                    .hide()
                    .removeClass('is-visible');

                this.captionControlEl
                    .removeClass('is-active')
                    .attr('title', gettext('Turn on closed captioning'))
                    .find('.control-text')
                        .text(gettext('Turn on closed captioning'));

                this.state.el.trigger('captions:hide');
            },

            updateCaptioningCookie: function(method) {
                if (method) {
                    $.cookie('show_closed_captions', 'true', {
                        expires: 3650,
                        path: '/'
                    });
                } else {
                    $.cookie('show_closed_captions', null, {
                        path: '/'
                    });
                }
            },

            listenForDragDrop: function() {
                var captions = document.querySelector('.closed-captions'),
                    draggable;

                if (typeof Draggabilly === "function") {
                    draggable = new Draggabilly(captions, { containment: true });
                } else {
                    console.log('Closed captioning available but not draggable');
                }
            },

            /**
            * @desc Shows/Hides captions and updates the cookie.
            *
            * @param {boolean} hide_captions if `true` hides the caption,
            *     otherwise - show.
            * @param {boolean} update_cookie Flag to update or not the cookie.
            *
            */
            hideCaptions: function (hide_captions, update_cookie, trigger_event) {
                var transcriptControlEl = this.transcriptControlEl,
                    state = this.state, text;

                if (typeof update_cookie === 'undefined') {
                    update_cookie = true;
                }

                if (hide_captions) {
                    state.captionsHidden = true;
                    state.el.addClass('closed');
                    text = gettext('Turn on transcripts');
                    if (trigger_event) {
                        this.state.el.trigger('transcript:hide');
                    }

                    transcriptControlEl
                        .removeClass('is-active')
                        .attr('title', gettext(text))
                        .find('.control-text')
                            .text(gettext(text));
                } else {
                    state.captionsHidden = false;
                    state.el.removeClass('closed');
                    this.scrollCaption();
                    text = gettext('Turn off transcripts');
                    if (trigger_event) {
                        this.state.el.trigger('transcript:show');
                    }

                    transcriptControlEl
                        .addClass('is-active')
                        .attr('title', gettext(text))
                        .find('.control-text')
                            .text(gettext(text));
                }

                if (state.resizer) {
                    if (state.isFullScreen) {
                        state.resizer.setMode('both');
                    } else {
                        state.resizer.alignByWidthOnly();
                    }
                }

                this.setSubtitlesHeight();
                if (update_cookie) {
                    $.cookie('hide_captions', hide_captions, {
                        expires: 3650,
                        path: '/'
                    });
                }
            },

            /**
            * @desc Return the caption container height.
            *
            * @returns {number} event Height of the container in pixels.
            *
            */
            captionHeight: function () {
                var state = this.state;
                if (state.isFullScreen) {
                    return state.container.height() - state.videoFullScreen.height;
                } else {
                    return state.container.height();
                }
            },

            /**
            * @desc Sets the height of the caption container element.
            *
            */
            setSubtitlesHeight: function () {
                var height = 0,
                    state = this.state;
                // on page load captionHidden = undefined
                if  ((state.captionsHidden === undefined && state.hide_captions) ||
                    state.captionsHidden === true
                ) {
                    // In case of html5 autoshowing subtitles, we adjust height of
                    // subs, by height of scrollbar.
                    height = state.el.find('.video-controls').height() +
                        0.5 * state.el.find('.slider').height();
                    // Height of videoControl does not contain height of slider.
                    // css is set to absolute, to avoid yanking when slider
                    // autochanges its height.
                }

                this.subtitlesEl.css({
                    maxHeight: this.captionHeight() - height
                });
            }
        };

        return VideoCaption;
    });

}(RequireJS.define));
