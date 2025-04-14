
const emailTemplates = {
  'magic-link': {
    name: 'Magic Link',
    subject: 'Your login link for Sturij Calendar',
    content: `
      <h1>Login to Sturij Calendar</h1>
      <p>Click the link below to log in:</p>
      <p><a href="{{links.magic}}">Login now</a></p>
    `
  }
};

export default emailTemplates;
