import React, { useMemo, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  InputAdornment,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Button,
} from '@mui/material';
import {
  Search as SearchIcon,
  ExpandMore as ExpandMoreIcon,
  School as CoursesIcon,
  Person as AccountIcon,
  WorkspacePremium as CertificateIcon,
  Payment as BillingIcon,
  Build as TechnicalIcon,
  Groups as TeamIcon,
  MailOutline as MailIcon,
  ChatBubbleOutline as ChatIcon,
  Phone as PhoneIcon,
  ArrowForward as ArrowIcon,
} from '@mui/icons-material';

const INDIGO = '#312E81';
const INDIGO_SOFT = '#EEF2FF';
const BORDER = '#e5e7eb';

// ---- Content -------------------------------------------------------------
const CATEGORIES = [
  { key: 'courses', label: 'Courses & Lessons', icon: CoursesIcon, count: 12 },
  { key: 'account', label: 'Account & Profile', icon: AccountIcon, count: 8 },
  { key: 'certificates', label: 'Certificates', icon: CertificateIcon, count: 6 },
  { key: 'billing', label: 'Billing & Payments', icon: BillingIcon, count: 5 },
  { key: 'team', label: 'Team & Admin', icon: TeamIcon, count: 7 },
  { key: 'technical', label: 'Technical Issues', icon: TechnicalIcon, count: 9 },
];

const FAQS = [
  {
    category: 'courses',
    question: 'How do I enroll in a course?',
    answer:
      'Go to the Courses tab, open the course you want, and select "Enroll Now". Once enrolled, the course appears on your Dashboard and you can start any lesson right away.',
  },
  {
    category: 'courses',
    question: 'Can I access a course after I finish it?',
    answer:
      'Yes. Completed courses stay in your Dashboard under "Completed", and you can revisit lessons, videos, and quizzes at any time.',
  },
  {
    category: 'certificates',
    question: 'When do I receive my certificate?',
    answer:
      'Certificates are generated automatically once you pass the final exam for a course. You will get an email with your certificate and a verification link within a few minutes.',
  },
  {
    category: 'certificates',
    question: 'I passed the exam but have no certificate. What do I do?',
    answer:
      'First check your spam folder for the delivery email. If it is still missing after 30 minutes, open a support request from the Help Center and our team will reissue it.',
  },
  {
    category: 'account',
    question: 'How do I reset my password?',
    answer:
      'On the login page, select "Forgot password" and enter your registered email. You will receive a reset link valid for 30 minutes.',
  },
  {
    category: 'account',
    question: 'How do I update my email address?',
    answer:
      'Open your Profile from the top-right avatar menu, select "Edit Profile", update your email, and confirm the change from the verification email we send you.',
  },
  {
    category: 'billing',
    question: 'What payment methods are supported?',
    answer:
      'We accept all major credit and debit cards, along with UPI and net banking for domestic learners. All payments are processed securely and never stored on our servers.',
  },
  {
    category: 'billing',
    question: 'Can I get a refund?',
    answer:
      'Refunds are available within 7 days of purchase if you have completed less than 20% of the course. Submit a request from Billing History and our team will review it within 2 business days.',
  },
  {
    category: 'team',
    question: 'How do I add a new team member as an admin?',
    answer:
      'From the admin sidebar, go to Team, select "Invite Member", and enter their email with the desired role. They will get an invite link to set up their account.',
  },
  {
    category: 'technical',
    question: 'Videos are buffering or not loading. What should I check?',
    answer:
      'Try switching to a lower video quality from the player settings, or use a different browser. If the issue persists on multiple devices, let us know your browser and connection type when you contact support.',
  },
  {
    category: 'technical',
    question: 'The site looks broken on my browser.',
    answer:
      'Our platform is tested on the latest versions of Chrome, Firefox, Edge, and Safari. Clearing your browser cache or updating to the latest version usually resolves layout issues.',
  },
];

const CONTACT_OPTIONS = [
  {
    icon: MailIcon,
    title: 'Email Support',
    body: 'Get a response within 24 hours.',
    action: 'support@eduplatform.com',
    href: 'mailto:support@eduplatform.com',
  },
  {
    icon: ChatIcon,
    title: 'Live Chat',
    body: 'Chat with our team, Mon–Fri, 9am–6pm.',
    action: 'Start a chat',
    href: '#',
  },
  {
    icon: PhoneIcon,
    title: 'Call Us',
    body: 'For urgent account or billing issues.',
    action: '+91 44 4000 1234',
    href: 'tel:+914440001234',
  },
];

const HelpCenter = () => {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState(null);
  const [expanded, setExpanded] = useState(null);

  const filteredFaqs = useMemo(() => {
    const query = search.trim().toLowerCase();
    return FAQS.filter((faq) => {
      const matchesCategory = !activeCategory || faq.category === activeCategory;
      const matchesSearch =
        !query ||
        faq.question.toLowerCase().includes(query) ||
        faq.answer.toLowerCase().includes(query);
      return matchesCategory && matchesSearch;
    });
  }, [search, activeCategory]);

  const handleAccordionChange = (id) => (_, isExpanded) => {
    setExpanded(isExpanded ? id : null);
  };

  return (
    <Box sx={{ bgcolor: '#F8F9FC', minHeight: '100vh', p: 3 }}>
      {/* Header + hero search */}
      <Box
        sx={{
          bgcolor: INDIGO,
          borderRadius: 4,
          p: { xs: 3, sm: 5 },
          mb: 4,
          textAlign: 'center',
        }}
      >
        <Typography variant="h4" sx={{ color: 'white', fontWeight: 800, mb: 1 }}>
          How can we help?
        </Typography>
        <Typography variant="body1" sx={{ color: '#C7D2FE', mb: 3 }}>
          Search our help articles or browse by topic below.
        </Typography>
        <TextField
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search for answers, e.g. 'reset password'"
          fullWidth
          size="medium"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: '#999' }} />
              </InputAdornment>
            ),
          }}
          sx={{
            maxWidth: 560,
            mx: 'auto',
            bgcolor: 'white',
            borderRadius: '10px',
            '& .MuiOutlinedInput-root': { borderRadius: '10px' },
          }}
        />
      </Box>

      {/* Category chips */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 4 }}>
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const active = activeCategory === cat.key;
          return (
            <Paper
              key={cat.key}
              onClick={() => setActiveCategory(active ? null : cat.key)}
              variant="outlined"
              sx={{
                flex: '1 1 200px',
                minWidth: 0,
                p: 2.5,
                borderRadius: 3,
                cursor: 'pointer',
                borderColor: active ? INDIGO : BORDER,
                borderWidth: active ? 2 : 1,
                bgcolor: active ? INDIGO_SOFT : 'white',
                transition: 'all 0.15s ease',
                '&:hover': { borderColor: INDIGO },
              }}
            >
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: 2,
                  bgcolor: active ? INDIGO : INDIGO_SOFT,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mb: 1.5,
                }}
              >
                <Icon sx={{ color: active ? 'white' : INDIGO, fontSize: 20 }} />
              </Box>
              <Typography variant="subtitle1" fontWeight={700}>
                {cat.label}
              </Typography>
              <Typography variant="caption" sx={{ color: '#888' }}>
                {cat.count} articles
              </Typography>
            </Paper>
          );
        })}
      </Box>

      {/* FAQ list */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
        <Box sx={{ flex: '2 1 560px', minWidth: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6" fontWeight={700}>
              {activeCategory
                ? CATEGORIES.find((c) => c.key === activeCategory)?.label
                : 'Frequently asked questions'}
            </Typography>
            {activeCategory && (
              <Chip
                label="Clear filter"
                size="small"
                onClick={() => setActiveCategory(null)}
                sx={{ bgcolor: INDIGO_SOFT, color: INDIGO, fontWeight: 600, cursor: 'pointer' }}
              />
            )}
          </Box>

          {filteredFaqs.length === 0 ? (
            <Paper
              variant="outlined"
              sx={{ p: 4, borderRadius: 3, textAlign: 'center', borderColor: BORDER }}
            >
              <Typography variant="body1" sx={{ color: '#666', mb: 0.5 }}>
                No answers matched "{search}".
              </Typography>
              <Typography variant="body2" sx={{ color: '#999' }}>
                Try a different search term, or contact support below.
              </Typography>
            </Paper>
          ) : (
            filteredFaqs.map((faq, idx) => (
              <Accordion
                key={faq.question}
                expanded={expanded === idx}
                onChange={handleAccordionChange(idx)}
                disableGutters
                elevation={0}
                sx={{
                  mb: 1.5,
                  border: `1px solid ${BORDER}`,
                  borderRadius: '12px !important',
                  overflow: 'hidden',
                  '&:before': { display: 'none' },
                }}
              >
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon sx={{ color: expanded === idx ? INDIGO : '#999' }} />}
                  sx={{
                    px: 2.5,
                    py: 0.5,
                    '& .MuiAccordionSummary-content': { my: 1.5 },
                  }}
                >
                  <Typography
                    variant="subtitle1"
                    sx={{ fontWeight: 600, color: expanded === idx ? INDIGO : '#111' }}
                  >
                    {faq.question}
                  </Typography>
                </AccordionSummary>
                <AccordionDetails sx={{ px: 2.5, pb: 2.5, pt: 0 }}>
                  <Typography variant="body2" sx={{ color: '#555', lineHeight: 1.7 }}>
                    {faq.answer}
                  </Typography>
                </AccordionDetails>
              </Accordion>
            ))
          )}
        </Box>

        {/* Contact panel */}
        <Box sx={{ flex: '1 1 300px', minWidth: 0 }}>
          <Paper
            variant="outlined"
            sx={{ p: 3, borderRadius: 3, borderColor: BORDER, position: 'sticky', top: 24 }}
          >
            <Typography variant="h6" fontWeight={700} sx={{ mb: 0.5 }}>
              Still need help?
            </Typography>
            <Typography variant="body2" sx={{ color: '#666', mb: 2.5 }}>
              Our support team is happy to help with anything not covered here.
            </Typography>

            {CONTACT_OPTIONS.map((option) => {
              const Icon = option.icon;
              return (
                <Box
                  key={option.title}
                  component="a"
                  href={option.href}
                  sx={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 1.5,
                    p: 1.5,
                    mb: 1,
                    borderRadius: 2,
                    textDecoration: 'none',
                    color: 'inherit',
                    '&:hover': { bgcolor: INDIGO_SOFT },
                  }}
                >
                  <Box
                    sx={{
                      width: 36,
                      height: 36,
                      borderRadius: 2,
                      bgcolor: INDIGO_SOFT,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Icon sx={{ color: INDIGO, fontSize: 18 }} />
                  </Box>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="subtitle2" fontWeight={700}>
                      {option.title}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#888', display: 'block', mb: 0.25 }}>
                      {option.body}
                    </Typography>
                    <Typography variant="caption" sx={{ color: INDIGO, fontWeight: 700 }}>
                      {option.action}
                    </Typography>
                  </Box>
                </Box>
              );
            })}

            <Button
              fullWidth
              variant="contained"
              endIcon={<ArrowIcon />}
              sx={{
                mt: 1,
                bgcolor: INDIGO,
                textTransform: 'none',
                fontWeight: 700,
                borderRadius: '8px',
                '&:hover': { bgcolor: '#23206b' },
              }}
            >
              Submit a Support Ticket
            </Button>
          </Paper>
        </Box>
      </Box>
    </Box>
  );
};

export default HelpCenter;