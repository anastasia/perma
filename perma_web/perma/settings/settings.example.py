# NOTE: If you are running a local test environment, settings_dev will already have sensible defaults for many of these.
# Only override the ones you need to, so you're less likely to have to make manual settings updates after pulling in changes.

# Choose one of these:
from .deployments.settings_dev import *
# from .deployments.settings_prod import *


ADMINS = (
    # ('Your Name', 'your_email@example.com'),
)

MANAGERS = ADMINS

DATABASES['default']['NAME'] = 'perma'
DATABASES['default']['USER'] = 'perma'
DATABASES['default']['PASSWORD'] = 'perma'

# This is handy for debugging problems that *only* happen when Debug = False,
# because exceptions are printed directly to the log/console when they happen.
# Just don't leave it on!
# DEBUG_PROPAGATE_EXCEPTIONS = True

# Make this unique, and don't share it with anybody.
SECRET_KEY = ''

# Hosts/domain names that are valid for this site; required if DEBUG is False
# See https://docs.djangoproject.com/en/1.5/ref/settings/#allowed-hosts
ALLOWED_HOSTS = []

# If the phantomjs binary isn't in your path, you can set the location here
# PHANTOMJS_BINARY = os.path.join(PROJECT_ROOT, 'lib/phantomjs')

# Dump our collected assets here
# STATIC_ROOT = os.path.join(PROJECT_ROOT, 'static-collected')

# This is where we dump the generated WARCs, PNGs, and so on. If you're running
# in prod, you'll likely want to set this
# MEDIA_ROOT = '/perma/assets/generated'

# To populate the from field of emails sent from Perma
DEFAULT_FROM_EMAIL = 'email@example.com'

# Email for the contact developer (where we send weekly stats)
DEVELOPER_EMAIL = DEFAULT_FROM_EMAIL


# The host we want to display
# Likely set to localhost:8000 if you're working in a dev instance
HOST = 'perma.cc'


# Sauce Labs credentials
SAUCE_USERNAME = ''
SAUCE_ACCESS_KEY = ''

# in a dev server, if you want to use a separate subdomain for user-generated content like on prod,
# you can do something like this (assuming *.dev is mapped to localhost in /etc/hosts):
# WARC_HOST = 'content.perma.dev:8000'
# MEDIA_URL = '//content.perma.dev:8000/media/'
# DEBUG_MEDIA_URL = '/media/'

# Perma.cc encryption keys for communicating with Perma-Payments
# generated using perma_payments.security.generate_public_private_keys
# SECURITY WARNING: keep the production secret key secret!
PERMA_PAYMENTS_ENCRYPTION_KEYS = {
    'id': 3,
    'perma_payments_secret_key': b'7\xe6#\xef\x08\xe4\xab\xc1#i\xcc\xb4\xb9\x02|\x17\xe4\x8c\xd7\x0e\x14nW\x96q\xbc\x99\xb5\xf13\x18A',
    'perma_payments_public_key': b'\x0co(\xf5\xc4\xb9.\x07\xae\xbb\xb5\xc0\x17O,\xc3F\x8e_\xb9\x89\x16\xefSTK]\xae\xb0P\x1c6',
    'perma_public_key': b'fi\x16S\xa0\x1dBSk\x0c"\xcd#^x\x1d!\x87\xf7\xa8\xe3\xb3mT\x03r\xbeb\x9a\x9e\xcdh',
}
PERMA_PAYMENTS_TIMESTAMP_MAX_AGE_SECONDS = 120

SUBSCRIBE_URL = 'https://perma-payments-subscribe-route'
SUBSCRIPTION_CURRENT_URL = 'https://perma-payments-current-route'
