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
                    this.enrollModel = options.enrollModel;
                    this.listenTo(this.enrollModel, 'change:enrolled', this.updateIsEnrolled);
                    this.render();
                },

                updateIsEnrolled: function(){
                    this.model.set({
                        is_enrolled: true
                    });
                },

                render: function() {
                    if (this.enrollModel && this.model.get('course_key')){
                        var filledTemplate = this.tpl(this.model.toJSON());
                        HtmlUtils.setHtml(this.$el, filledTemplate);
                        this.$('.run-select').val(this.model.getActiveRunMode().run_key);
                    }
                },

                handleEnroll: function(){
                    //Enrollment click event handled here
                    if(!this.model.get('is_enrolled')){
                        // actually enroll
                        this.enrollModel.enroll(this.model.get('mode_slug'));
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
                }
            });
        }
    );
}).call(this, define || RequireJS.define);
