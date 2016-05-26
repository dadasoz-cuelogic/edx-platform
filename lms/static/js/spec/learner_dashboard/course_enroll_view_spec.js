define([
        'backbone',
        'jquery',
        'js/learner_dashboard/models/course_card_model',
        'js/learner_dashboard/models/course_enroll_model',
        'js/learner_dashboard/views/course_enroll_view'
    ], function (Backbone, $, CourseCardModel, CourseEnrollModel, CourseEnrollView) {
        
        'use strict';
        
        describe('Course Enroll View', function () {
            var view = null,
                courseCardModel,
                courseEnrollModel,
                setupView,
                singleRunModeList = [{
                    start_date: 'Apr 25, 2016',
                    end_date: 'Jun 13, 2016',
                    course_key: 'course-v1:course-v1:edX+DemoX+Demo_Course',
                    course_url: 'http://localhost:8000/courses/course-v1:edX+DemoX+Demo_Course/info',
                    course_image_url: 'http://test.com/image1',
                    marketing_url: 'http://test.com/image2',
                    mode_slug: 'verified',
                    run_key: '2T2016',
                    is_enrolled: false
                }],
                multiRunModeList = [{
                    start_date: 'May 21, 2015',
                    end_date: 'Sep 21, 2015',
                    course_key: 'course-v1:course-v1:edX+DemoX+Demo_Course',
                    course_url: 'http://localhost:8000/courses/course-v1:edX+DemoX+Demo_Course/info',
                    course_image_url: 'http://test.com/run_2_image_1',
                    marketing_url: 'http://test.com/run_2_image_2',
                    mode_slug: 'verified',
                    run_key: '1T2015',
                    is_enrolled: false
                },{
                    start_date: 'Sep 22, 2015',
                    end_date: 'Dec 28, 2015',
                    course_key: 'course-v1:course-v1:edX+DemoX+Demo_Course',
                    course_url: 'http://localhost:8000/courses/course-v1:edX+DemoX+Demo_Course/info',
                    course_image_url: 'http://test.com/run_3_image_1',
                    marketing_url: 'http://test.com/run_3_image_2',
                    mode_slug: 'verified',
                    run_key: '2T2015',
                    is_enrolled: false
                }],
                context = {      
                    display_name: 'Edx Demo course',
                    key: 'edX+DemoX+Demo_Course',
                    organization: {
                        display_name: 'edx.org',
                        key: 'edX'
                    },
                };

            setupView = function(runModes){
                context.run_modes = runModes;
                setFixtures('<div class="course-actions"></div>');
                courseCardModel = new CourseCardModel(context);
                courseEnrollModel = new CourseEnrollModel({}, {
                    courseId: courseCardModel.get('course_key')
                });
                view = new CourseEnrollView({
                    $el: $('.course-actions'),
                    model: courseCardModel,
                    enrollModel: courseEnrollModel
                });
            };

            afterEach(function() {
                view.remove();
            });

            it('should exist', function() {
                setupView(singleRunModeList);
                expect(view).toBeDefined();
            });

            it('should render the course enroll view based on not enrolled data', function() {
                setupView(singleRunModeList);
                expect(view.$('.enrollment-info').html().trim()).toEqual('not enrolled');
                expect(view.$('.enroll-button').text().trim()).toEqual('Enroll Now');
                expect(view.$('.run-select').length).toBe(0);
            });

            it('should render the course enroll view based on enrolled data', function(){
                singleRunModeList[0].is_enrolled = true;
                setupView(singleRunModeList);
                expect(view.$('.enrollment-info').html().trim()).toEqual('enrolled');
                expect(view.$('.view-course-link').attr('href')).toEqual(
                    context.run_modes[0].course_url);
                expect(view.$('.view-course-link').text().trim()).toEqual('View Course');
                expect(view.$('.run-select').length).toBe(0);
            });

            it('should not render anything if run modes is empty', function(){
                setupView([]);
                expect(view.$('.enrollment-info').length).toBe(0);
                expect(view.$('.run-select').length).toBe(0);
                expect(view.$('.enroll-button').length).toBe(0);
            });

            it('should render run selection drop down if mulitple run available', function(){
                setupView(multiRunModeList);
                expect(view.$('.run-select').length).toBe(1);
                expect(view.$('.run-select').val()).toEqual(multiRunModeList[0].run_key);
            });

            it('should switch run context if dropdown selection changed', function(){
                setupView(multiRunModeList);
                spyOn(courseCardModel, 'updateRun').and.callThrough();
                expect(view.$('.run-select').val()).toEqual(multiRunModeList[0].run_key);
                view.$('.run-select').val(multiRunModeList[1].run_key);
                view.$('.run-select').trigger("change");
                expect(view.$('.run-select').val()).toEqual(multiRunModeList[1].run_key);
                expect(courseCardModel.updateRun)
                    .toHaveBeenCalledWith(multiRunModeList[1].run_key);
                expect(courseCardModel.getActiveRunMode()).toEqual(multiRunModeList[1]);
            });

            it('should enroll learner when enroll button clicked', function(){
                singleRunModeList[0].is_enrolled = false;
                setupView(singleRunModeList);
                expect(view.$('.enroll-button').length).toBe(1);
                spyOn(courseEnrollModel, 'enroll');
                view.$('.enroll-button').click();
                expect(courseEnrollModel.enroll)
                    .toHaveBeenCalledWith(singleRunModeList[0].mode_slug);
            });

            it('should enroll learner into the updated run with button click', function(){
                setupView(multiRunModeList);
                spyOn(courseEnrollModel, 'enroll');
                view.$('.run-select').val(multiRunModeList[1].run_key);
                view.$('.run-select').trigger("change");
                view.$('.enroll-button').click();
                expect(courseEnrollModel.enroll)
                    .toHaveBeenCalledWith(multiRunModeList[1].mode_slug);
            });

            it('should update card model when enrolled changed', function(){
                singleRunModeList[0].is_enrolled = false;
                setupView(singleRunModeList);
                expect(view.$('.enroll-button').length).toBe(1);
                courseEnrollModel.set({
                    enrolled: true
                });
                expect(courseCardModel.get('is_enrolled')).toBe(true);
            });
        });
    }
);
