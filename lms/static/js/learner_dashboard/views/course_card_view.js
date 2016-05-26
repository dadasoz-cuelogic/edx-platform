;(function (define) {
    'use strict';

    define(['backbone',
            'jquery',
            'underscore',
            'gettext',
            'edx-ui-toolkit/js/utils/html-utils',
            'js/learner_dashboard/models/course_enroll_model',
            'js/learner_dashboard/views/course_enroll_view',
            'text!../../../templates/learner_dashboard/course_card.underscore'
           ],
         function(
             Backbone,
             $,
             _,
             gettext,
             HtmlUtils,
             EnrollModel,
             CourseEnrollView,
             pageTpl
         ) {
            return Backbone.View.extend({
                className: 'course-card card',

                tpl: HtmlUtils.template(pageTpl),

                initialize: function() {
                    this.enrollModel = new EnrollModel({}, {
                        courseId: this.model.get('course_key')
                    });
                    this.render();
                    this.listenTo(this.model, 'change', this.render);
                },

                render: function() {
                    var filledTemplate = this.tpl(this.model.toJSON());
                    HtmlUtils.setHtml(this.$el, filledTemplate);
                    this.postRender();
                },

                postRender: function(){
                    HtmlUtils.setHtml(
                        this.$('.course-actions'),
                        HtmlUtils.HTML(
                            new CourseEnrollView({
                                model: this.model,
                                context: this.context,
                                enrollModel: this.enrollModel
                            }).$el
                        )
                    );
                }
            });
        }
    );
}).call(this, define || RequireJS.define);
