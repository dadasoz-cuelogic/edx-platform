"""
Django storage backends for Open edX.
"""
from django_pipeline_forgiving.storages import PipelineForgivingStorage
from django.contrib.staticfiles.storage import StaticFilesStorage
from pipeline.storage import NonPackagingMixin
from require.storage import OptimizedFilesMixin
from openedx.core.djangoapps.theming.storage import (
    ThemeStorage,
    ComprehensiveThemingCachedFilesMixin,
    ThemePipelineMixin
)


class ProductionStorage(
        # TODO: Investigate the effect of this on theming
        PipelineForgivingStorage,
        OptimizedFilesMixin,
        ThemePipelineMixin,
        ComprehensiveThemingCachedFilesMixin,
        ThemeStorage,
        StaticFilesStorage
):
    """
    This class combines Django's StaticFilesStorage class with several mixins
    that provide additional functionality. We use this version on production.
    """
    pass


class DevelopmentStorage(
        NonPackagingMixin,
        ThemePipelineMixin,
        ThemeStorage,
        StaticFilesStorage
):
    """
    This class combines Django's StaticFilesStorage class with several mixins
    that provide additional functionality. We use this version for development,
    so that we can skip packaging and optimization.
    """
    pass
