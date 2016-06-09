"""
Acceptance tests for Studio related to the textbooks.
"""
from common.test.acceptance.tests.studio.base_studio_test import StudioCourseTest
from ...pages.studio.textbooks import TextbooksPage
from ...tests.helpers import disable_animations
from nose.plugins.attrib import attr
from nose.tools import set_trace


@attr('shard_2')
class TextbooksTest(StudioCourseTest):
    """
    Test that textbook functionality is working properly on studio side
    """
    def setUp(self, is_staff=True):
        """
        Install a course with no content using a fixture.
        """
        super(TextbooksTest, self).setUp(is_staff)
        self.textbook_page = TextbooksPage(
            self.browser,
            self.course_info['org'],
            self.course_info['number'],
            self.course_info['run']
        )
        self.textbook_page.visit()
        disable_animations(self)

    def test_create_first_book_message(self):
        """
        Scenario: A message is displayed on the textbooks page when there are no uploaded textbooks
        Given that I am viewing the Textbooks page in Studio
        And I have not yet uploaded a textbook
        Then I see a message stating that I have not uploaded any textbooks
        """
        message = self.textbook_page.get_element_text('.wrapper-content .no-textbook-content')
        self.assertIn("You haven't added any textbooks", message)

    def test_new_textbook_upload(self):
        """
        Scenario: View Live link for textbook is correctly populated
        Given that I am viewing the Textbooks page in Studio
        And I have uploaded a PDF textbook and save the new textbook information
        Then the "View Live" link contains a link to the textbook in the LMS
        """
        self.textbook_page.upload_new_textbook()
        self.assertTrue(self.textbook_page.is_view_live_link_worked())

    @attr('a11y')
    def test_textbook_page_a11y(self):
        self.textbook_page.upload_new_textbook()
        self.textbook_page.click_view_live_link()
        self.textbook_page.a11y_audit.config.set_scope([
            'iframe'
        ])
        self.textbook_page.a11y_audit.config.set_rules({
            'ignore': [
            ],
        })
        set_trace()
        self.textbook_page.a11y_audit.check_for_accessibility_errors()
