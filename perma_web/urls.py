from django.conf.urls import url, include
from django.contrib import admin
from django.conf.urls import handler500  # noqa

admin.autodiscover()

# Setting our custom route handler so that images are displayed properly
# Used implicitly by Django
handler500 = 'perma.views.error_management.server_error'  # noqa

urlpatterns = [
    url(r'^admin/', include(admin.site.urls)),  # Django admin
    url(r'^api/', include('api.urls')), # Our API mirrored for session access
    url(r'^lockss/', include('lockss.urls', namespace='lockss')), # Our app that communicates with the mirror network
    url(r'^', include('compare.urls')),  # where we compute differences between archives and bundles of archives
    url(r'^', include('perma.urls')), # The Perma app
]
