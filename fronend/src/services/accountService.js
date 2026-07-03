const rawApiBaseUrl = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');
const API_BASE_URL = rawApiBaseUrl.endsWith('/api') ? rawApiBaseUrl : `${rawApiBaseUrl}/api`;

const normalizeEmail = (value) => (value || '').trim().toLowerCase();

const getCurrentUserEmail = () => normalizeEmail(localStorage.getItem('currentUserEmail'));

const requestJson = async (path, options = {}) => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.detail || data?.message || `API error: ${response.status}`);
  }

  return data;
};

export const listOrganizations = async () => {
  const ownerEmail = getCurrentUserEmail();
  const query = ownerEmail ? `?owner_email=${encodeURIComponent(ownerEmail)}` : '';
  return requestJson(`/organizations${query}`, { method: 'GET' });
};

export const createOrganization = async (organization) => {
  const ownerEmail = getCurrentUserEmail();
  return requestJson('/organizations', {
    method: 'POST',
    body: JSON.stringify({
      owner_email: ownerEmail,
      name: organization.name,
      sector: organization.sector,
      community: organization.community,
      description: organization.description,
    }),
  });
};

export const listPaymentMethods = async () => {
  const ownerEmail = getCurrentUserEmail();
  const query = ownerEmail ? `?owner_email=${encodeURIComponent(ownerEmail)}` : '';
  return requestJson(`/payment-methods${query}`, { method: 'GET' });
};

export const createPaymentMethod = async (paymentMethod) => {
  const ownerEmail = getCurrentUserEmail();
  return requestJson('/payment-methods', {
    method: 'POST',
    body: JSON.stringify({
      owner_email: ownerEmail,
      cardholder_name: paymentMethod.cardholderName,
      card_number: paymentMethod.cardNumber,
      expiry_month: paymentMethod.expiryMonth,
      expiry_year: paymentMethod.expiryYear,
      brand: paymentMethod.brand,
    }),
  });
};

export const listSimulations = async () => requestJson('/simulations', { method: 'GET' });

export const registerReviewer = async (reviewer) => requestJson('/reviewers/register', {
  method: 'POST',
  body: JSON.stringify(reviewer),
});

export const loginReviewer = async (credentials) => requestJson('/reviewers/login', {
  method: 'POST',
  body: JSON.stringify(credentials),
});

export const listReviewers = async ({ ownerEmail = '', organizationId = '' } = {}) => {
  const query = new URLSearchParams();
  if (ownerEmail) query.set('owner_email', ownerEmail);
  if (organizationId) query.set('organization_id', organizationId);
  const suffix = query.toString() ? `?${query.toString()}` : '';
  return requestJson(`/reviewers${suffix}`, { method: 'GET' });
};

export const listReviews = async ({ simulationId = '', reviewerEmail = '', organizationId = '' } = {}) => {
  const query = new URLSearchParams();
  if (simulationId) query.set('simulation_id', simulationId);
  if (reviewerEmail) query.set('reviewer_email', reviewerEmail);
  if (organizationId) query.set('organization_id', organizationId);
  const suffix = query.toString() ? `?${query.toString()}` : '';
  return requestJson(`/reviews${suffix}`, { method: 'GET' });
};

export const submitReview = async (review) => requestJson('/reviews', {
  method: 'POST',
  body: JSON.stringify(review),
});

export const getProfile = async () => {
  const ownerEmail = getCurrentUserEmail();
  const query = ownerEmail ? `?owner_email=${encodeURIComponent(ownerEmail)}` : '';
  return requestJson(`/profile${query}`, { method: 'GET' });
};

export const saveProfile = async (profile) => {
  const ownerEmail = getCurrentUserEmail();
  return requestJson('/profile', {
    method: 'POST',
    body: JSON.stringify({
      owner_email: ownerEmail,
      name: profile.name,
      email: profile.email,
      phone: profile.phone,
      company: profile.company,
      job_title: profile.jobTitle,
      description: profile.description,
    }),
  });
};

export default {
  listOrganizations,
  createOrganization,
  listPaymentMethods,
  createPaymentMethod,
  listSimulations,
  registerReviewer,
  loginReviewer,
  listReviewers,
  listReviews,
  submitReview,
  getProfile,
  saveProfile,
};
