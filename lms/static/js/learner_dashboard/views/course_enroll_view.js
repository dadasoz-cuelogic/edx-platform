;(function (define) {
    'use strict';

    define(['backbone',
            'jquery',
            'underscore',
            'gettext',
            'edx-ui-toolkit/js/utils/html-utils',
            'text!../../../templates/learner_dashboard/course_enroll.underscore'
           ],
         function(
             Backbone,
             $,
             _,
             gettext,
             HtmlUtils,
             pageTpl
         ) {
            return Backbone.View.extend({
                tpl: HtmlUtils.template(pageTpl),

                events: {
                    'click .enroll-button': 'handleEnroll',
                    'change .run-select': 'handleRunSelect',
                },

                initialize: function(options) {
                    this.$parentEl = options.$parentEl;
                    this.enrollModel = options.enrollModel;
                    this.render();
                    this.trackSelectionUrl = '/course_modes/choose/';
                    this.dashboardUrl = '/dashboard';
                    this.verificationUrl = '/verify_student/start-flow/';
                },

                updateIsEnrolled: function(){
                    
                },

                render: function() {
                    var filledTemplate;
                    if (this.$parentEl &&
                        this.enrollModel &&
                        this.model.get('course_key')){

                        filledTemplate = this.tpl(this.model.toJSON());
                        HtmlUtils.setHtml(this.$el, filledTemplate);
                        HtmlUtils.setHtml(this.$parentEl, HtmlUtils.HTML(this.$el));
                        this.$('.run-select').val(this.model.get('run_key'));
                    }
                },

                handleEnroll: function(){
                    //Enrollment click event handled here
                    if(!this.model.get('is_enrolled')){
                        // actually enroll
                        this.enrollModel.save({
                            course_id: this.model.get('course_key')
                        }, {
                            success: _.bind(this.enrollSuccess, this),
                            error: _.bind(this.enrollError, this)
                        });
                    }
                },

                handleRunSelect: function(event){
                    var runKey;
                    if(event.target){
                        runKey = $(event.target).val();
                        if(runKey){
                            this.model.updateRun(runKey);
                        }
                    }
                },

                enrollSuccess: function(){
                    var track = this.model.get('mode_slug'),
                        courseKey = this.model.get('course_key');
                    if (track) {
                        if ( track === 'honor' || track === 'audit' ) {
                            this.model.set({
                                is_enrolled: true
                            });
                        } else  {
                            // Go to the start of the verification flow
                            this.redirect( this.verificationUrl + courseKey + '/' );
                        }
                    } else {
                        // Go to track selection page
                        this.redirect( this.trackSelectionUrl + courseKey );
                    }
                },

                enrollError: function(model, response) {

                    if (response.status === 403 && response.responseJSON.user_message_url) {
                        /**
                         * Check if we've been blocked from the course
                         * because of country access rules.
                         * If so, redirect to a page explaining to the user
                         * why they were blocked.
                         */
                        this.redirect( response.responseJSON.user_message_url );
                    } else {
                        /**
                         * Otherwise, go to the track selection page as usual.
                         * This can occur, for example, when a course does not
                         * have a free enrollment mode, so we can't auto-enroll.
                         */
                        this.redirect( this.trackSelectionUrl + this.model.get('course_key') );
                    }
                },

                redirect: function( url ) {
                    window.location.href = url;
                }
            });
        }
    );
}).call(this, define || RequireJS.define);
