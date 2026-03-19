import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const resources = {
  en: {
    translation: {
      "app": {
        "name": "PJPDF",
        "title": "PJPDF - PDF Editor"
      },
      "tabs": {
        "home": "HOME",
        "edit": "EDIT",
        "view": "VIEW",
        "protect": "PROTECT"
      },
      "actions": {
        "open": "Open PDF",
        "save": "Save",
        "save_as": "Save As",
        "search": "Search",
        "add_text": "Add Text",
        "protect": "Protect",
        "rotate": "Rotate 90°",
        "extract": "Extract Page",
        "delete": "Delete Page",
        "ocr": "Extract Text (OCR)",
        "cancel": "Cancel",
        "update": "Update",
        "merge": "Merge Files"
      },
      "sidebar": {
        "thumbnails": "THUMBNAILS",
        "no_doc": "No document open",
        "edit_tools": "PAGE_MODIFIER",
        "navigation": "READER_MODE",
        "all_tabs": "ALL TABS"
      },
      "properties": {
        "title": "Properties",
        "character": "Character",
        "font_family": "Font Family",
        "size": "Size",
        "color": "Color",
        "paragraph": "Paragraph",
        "settings": "Settings",
        "processing": "PROCESSING...",
        "uuid": "Document UUID"
      },
      "messages": {
        "no_doc_loaded": "NO DOCUMENT LOADED",
        "select_pdf": "SELECT PDF",
        "rendering": "RENDERING PAGE...",
        "saved_success": "Document saved successfully!",
        "extracted_success": "Page extracted successfully!",
        "merge_min_files": "You need at least 2 open files to merge.",
        "merge_success": "Files merged successfully!",
        "merge_failed": "Failed to merge files.",
        "delete_page_confirm": "Are you sure you want to delete this page? This action cannot be undone.",
        "enter_password": "Enter password to protect PDF:",
        "protect_success": "PDF protected successfully!"
      }
    }
  },
  vi: {
    translation: {
      "app": {
        "name": "PJPDF",
        "title": "PJPDF - Trình chỉnh sửa PDF"
      },
      "tabs": {
        "home": "TRANG CHỦ",
        "edit": "CHỈNH SỬA",
        "view": "XEM",
        "protect": "BẢO MẬT"
      },
      "actions": {
        "open": "Mở PDF",
        "save": "Lưu đè",
        "save_as": "Lưu bản sao",
        "search": "Tìm kiếm",
        "add_text": "Thêm văn bản",
        "protect": "Bảo vệ",
        "rotate": "Xoay 90°",
        "extract": "Trích xuất trang",
        "delete": "Xóa trang",
        "ocr": "Trích xuất chữ (OCR)",
        "cancel": "Hủy",
        "update": "Cập nhật",
        "merge": "Gộp tất cả PDF"
      },
      "sidebar": {
        "thumbnails": "HÌNH THU NHỎ",
        "no_doc": "Chưa mở tài liệu",
        "edit_tools": "CÔNG CỤ TRANG",
        "navigation": "CHẾ ĐỘ ĐỌC",
        "all_tabs": "CÁC TAB ĐANG MỞ"
      },
      "properties": {
        "title": "Thuộc tính",
        "character": "Ký tự",
        "font_family": "Phông chữ",
        "size": "Kích thước",
        "color": "Màu sắc",
        "paragraph": "Đoạn văn",
        "settings": "Cài đặt",
        "processing": "ĐANG XỬ LÝ...",
        "uuid": "Mã định danh"
      },
      "messages": {
        "no_doc_loaded": "CHƯA CÓ TÀI LIỆU",
        "select_pdf": "CHỌN FILE PDF",
        "rendering": "ĐANG TẢI TRANG...",
        "saved_success": "Đã lưu tài liệu thành công!",
        "extracted_success": "Đã trích xuất trang thành công!",
        "merge_min_files": "Bạn cần ít nhất 2 file đang mở để gộp.",
        "merge_success": "Gộp tệp thành công!",
        "merge_failed": "Gộp tệp thất bại.",
        "delete_page_confirm": "Bạn có chắc chắn muốn xóa trang này không? Hành động này không thể hoàn tác.",
        "enter_password": "Nhập mật khẩu để bảo vệ PDF:",
        "protect_success": "Bảo vệ PDF thành công!"
      }
    }
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
