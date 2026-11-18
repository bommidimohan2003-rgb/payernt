import unittest
import json
from unittest.mock import patch, MagicMock
from backend.database import (
    record_user_consent,
    get_user_consents,
    create_privacy_request,
    get_user_privacy_requests,
    get_all_privacy_requests_admin,
    resolve_privacy_request,
    get_user_personal_data_summary,
    export_user_personal_data,
    get_reviews_from_db,
)


class TestLegalPrivacyAndCompliance(unittest.TestCase):
    """
    Automated test suite verifying the 11 areas of Legal, Privacy, Accessibility,
    Trust and Indian Statutory Compliance across paYent.
    """

    def setUp(self):
        self.test_email = "test_user_compliance@payent.com"
        self.test_session = "sess_test_12345"

    def test_record_and_retrieve_user_consent(self):
        """Requirement 5: Test consent recording and audit retrieval under DPDP Act 2023."""
        prefs = {
            "necessary": True,
            "functional": True,
            "analytics": False,
            "marketing": False,
        }
        rec = record_user_consent(
            user_id_or_session=self.test_session,
            consent_type="COOKIE_CONSENT",
            preferences=prefs,
            user_email=self.test_email,
            policy_version="2026.1",
            ip_address="127.0.0.1",
            user_agent="Mozilla/5.0 TestBrowser",
        )
        self.assertIsNotNone(rec)
        self.assertEqual(rec["consent_type"], "COOKIE_CONSENT")
        self.assertEqual(rec["policy_version"], "2026.1")

        # Retrieve consents
        history = get_user_consents(self.test_session)
        self.assertIsInstance(history, list)
        self.assertTrue(any(c["consent_type"] == "COOKIE_CONSENT" for c in history))

    def test_privacy_request_lifecycle(self):
        """Requirement 6: Test data principal rights lifecycle (create, list, resolve)."""
        # 1. Create Data Correction Request
        req = create_privacy_request(
            user_email=self.test_email,
            request_type="CORRECTION",
            details="Please update my alternate phone number to +91 98765 00000",
        )
        self.assertIsNotNone(req)
        self.assertTrue(req["id"].startswith("DPR-"))
        self.assertEqual(req["status"], "PENDING")
        req_id = req["id"]

        # 2. Retrieve user privacy requests
        user_reqs = get_user_privacy_requests(self.test_email)
        self.assertTrue(any(r["id"] == req_id for r in user_reqs))

        # 3. Admin view
        admin_reqs = get_all_privacy_requests_admin()
        self.assertTrue(any(r["id"] == req_id for r in admin_reqs))

        # 4. Resolve request
        resolved = resolve_privacy_request(
            request_id=req_id,
            status="RESOLVED",
            resolution_notes="Contact record updated in accordance with DPDP Section 12.",
            resolved_by="admin@payent.com",
        )
        self.assertTrue(resolved)

        # Check status updated
        updated_user_reqs = get_user_privacy_requests(self.test_email)
        target = next(r for r in updated_user_reqs if r["id"] == req_id)
        self.assertEqual(target["status"], "RESOLVED")
        self.assertEqual(target["resolved_by"], "admin@payent.com")

    def test_personal_data_summary_and_export(self):
        """Requirement 1 & 6: Test DPDP Section 11 personal data summary and structured export."""
        summary = get_user_personal_data_summary(self.test_email)
        self.assertIn("profile", summary)
        self.assertIn("kyc", summary)
        self.assertIn("activityCounts", summary)
        self.assertIn("retentionNotice", summary)
        self.assertTrue("years" in summary["retentionNotice"])

        # Test export archive
        export_archive = export_user_personal_data(self.test_email)
        self.assertIn("exportMetadata", export_archive)
        self.assertIn("userProfile", export_archive)
        self.assertIn("identityAndKYC", export_archive)
        self.assertIn("consentHistory", export_archive)
        self.assertEqual(export_archive["exportMetadata"]["dataSubject"], self.test_email)
        self.assertIn("Digital Personal Data Protection Act", export_archive["exportMetadata"]["statutoryBasis"])

    def test_review_integrity_no_fake_identities(self):
        """Requirement 10A: Test review query does not manufacture fake 'Verified Renter' names."""
        res = get_reviews_from_db(limit=5)
        self.assertIsInstance(res, dict)
        self.assertIn("reviews", res)
        review_list = res["reviews"]
        for r in review_list:
            user_name = r.get("user_name") or r.get("userName")
            # Must NEVER default to "Verified Renter"
            self.assertNotEqual(user_name, "Verified Renter")
            # Rating must be an integer or None, never forced to 5 if missing
            rating = r.get("rating")
            if rating is not None:
                self.assertIsInstance(rating, int)
                self.assertTrue(0 <= rating <= 5)

    def test_checkout_terms_consent_recording(self):
        """Requirement 5C: Test checkout terms agreement consent recording."""
        rec = record_user_consent(
            user_id_or_session=self.test_session,
            consent_type="CHECKOUT_TERMS",
            preferences={
                "terms_version": "2026.1",
                "refund_policy_version": "2026.1",
                "privacy_policy_version": "2026.1",
                "security_deposit_authorized": True,
            },
            user_email=self.test_email,
            policy_version="2026.1",
        )
        self.assertIsNotNone(rec)
        self.assertEqual(rec["consent_type"], "CHECKOUT_TERMS")
        prefs = json.loads(rec["preferences_json"]) if isinstance(rec["preferences_json"], str) else rec["preferences_json"]
        self.assertTrue(prefs["security_deposit_authorized"])


if __name__ == "__main__":
    unittest.main()
