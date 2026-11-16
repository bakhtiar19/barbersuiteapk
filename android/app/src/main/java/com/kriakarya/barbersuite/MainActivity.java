package com.kriakarya.barbersuite;

import android.content.ActivityNotFoundException;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.util.Base64;
import android.webkit.JavascriptInterface;
import androidx.core.content.FileProvider;
import com.getcapacitor.BridgeActivity;
import java.io.File;
import java.io.FileOutputStream;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        if (this.bridge != null && this.bridge.getWebView() != null) {
            this.bridge
                .getWebView()
                .addJavascriptInterface(new WhatsAppBridge(this), "AndroidWhatsAppBridge");
        }
    }

    @Override
    public void startActivity(Intent intent) {
        try {
            super.startActivity(intent);
        } catch (ActivityNotFoundException ex) {
            Uri data = intent != null ? intent.getData() : null;
            if (data != null && "whatsapp".equalsIgnoreCase(data.getScheme())) {
                String phone = data.getQueryParameter("phone");
                String text = data.getQueryParameter("text");
                String fallbackUrl =
                    "https://wa.me/" +
                    (phone != null ? phone : "") +
                    (text != null ? "?text=" + Uri.encode(text) : "");
                Intent browserIntent = new Intent(Intent.ACTION_VIEW, Uri.parse(fallbackUrl));
                super.startActivity(browserIntent);
                return;
            }
            throw ex;
        }
    }

    public static class WhatsAppBridge {
        private final MainActivity activity;

        public WhatsAppBridge(MainActivity activity) {
            this.activity = activity;
        }

        @JavascriptInterface
        public String sendReceiptToWhatsApp(
            String phone,
            String text,
            String base64Image,
            String filename
        ) {
            try {
                String cleanPhone = phone != null ? phone.replaceAll("[^0-9]", "") : "";
                if (cleanPhone.startsWith("0")) {
                    cleanPhone = "62" + cleanPhone.substring(1);
                } else if (cleanPhone.startsWith("8")) {
                    cleanPhone = "62" + cleanPhone;
                }
                if (cleanPhone.isEmpty()) {
                    return "error:invalid_phone";
                }

                String cleanBase64 =
                    base64Image != null && base64Image.contains(",")
                        ? base64Image.substring(base64Image.indexOf(",") + 1)
                        : (base64Image != null ? base64Image : "");
                byte[] imageBytes = Base64.decode(cleanBase64, Base64.DEFAULT);

                String safeName =
                    (filename != null && !filename.trim().isEmpty())
                        ? filename.replaceAll("[^a-zA-Z0-9._-]", "_")
                        : "struk.jpg";

                File imageFile = new File(activity.getCacheDir(), safeName);
                try (FileOutputStream fos = new FileOutputStream(imageFile)) {
                    fos.write(imageBytes);
                    fos.flush();
                }

                final Uri contentUri = FileProvider.getUriForFile(
                    activity,
                    activity.getPackageName() + ".fileprovider",
                    imageFile
                );
                final String jid = cleanPhone + "@s.whatsapp.net";
                final String[] resultHolder = new String[] { "error:not_found" };
                final CountDownLatch latch = new CountDownLatch(1);

                activity.runOnUiThread(() -> {
                    try {
                        try {
                            ClipboardManager clipboard =
                                (ClipboardManager) activity.getSystemService(
                                    Context.CLIPBOARD_SERVICE
                                );
                            if (clipboard != null && text != null) {
                                clipboard.setPrimaryClip(
                                    ClipData.newPlainText("Apresiasi Pelanggan", text)
                                );
                            }
                        } catch (Exception ignored) {}

                        String[] packages = new String[] { "com.whatsapp", "com.whatsapp.w4b" };
                        for (String pkg : packages) {
                            try {
                                Intent sendIntent = new Intent(Intent.ACTION_SEND);
                                sendIntent.setType("image/jpeg");
                                sendIntent.putExtra(Intent.EXTRA_STREAM, contentUri);
                                if (text != null) {
                                    sendIntent.putExtra(Intent.EXTRA_TEXT, text);
                                }
                                sendIntent.putExtra("jid", jid);
                                sendIntent.setPackage(pkg);
                                sendIntent.setClipData(ClipData.newRawUri("", contentUri));
                                sendIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                                activity.grantUriPermission(
                                    pkg,
                                    contentUri,
                                    Intent.FLAG_GRANT_READ_URI_PERMISSION
                                );
                                activity.startActivity(sendIntent);
                                resultHolder[0] = "sent:" + pkg;
                                return;
                            } catch (Exception ignored) {
                                // Try next WhatsApp package
                            }
                        }
                    } finally {
                        latch.countDown();
                    }
                });

                latch.await(3, TimeUnit.SECONDS);
                return resultHolder[0];
            } catch (Exception e) {
                return "error:" + e.getMessage();
            }
        }
    }
}
