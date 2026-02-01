import { render, screen } from '@testing-library/react';
import { SignupPage } from '@/components/SignupPage';

const mocks = vi.hoisted(() => ({
  RegistrationForm: vi.fn(),
  FooterLinks: vi.fn(),
}));

vi.mock('@/components/RegistrationForm', () => ({
  RegistrationForm: (props: unknown) => {
    mocks.RegistrationForm(props);
    return <div data-testid="RegistrationForm" />;
  },
}));

vi.mock('@/components/FooterLinks', () => ({
  FooterLinks: (props: unknown) => {
    mocks.FooterLinks(props);
    return <div data-testid="FooterLinks" />;
  },
}));

describe('SignupPage', () => {
  it('renders heading, RegistrationForm and FooterLinks', () => {
    render(<SignupPage />);

    expect(screen.getByRole('heading', { name: 'Utwórz konto' })).toBeInTheDocument();
    expect(screen.getByTestId('RegistrationForm')).toBeInTheDocument();
    expect(screen.getByTestId('FooterLinks')).toBeInTheDocument();
  });
});
