import { t as translateUi } from "./i18n/index.mjs";import { PolicyDocument } from './policyDocument.jsx';

export default function CurrentPrivacyNotice() {
  return <PolicyDocument kind="privacy" />;
}
