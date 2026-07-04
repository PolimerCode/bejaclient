; BejaClient custom NSIS theme
; Injected via electron-builder nsis.include

!define MUI_BGCOLOR "111316"
!define MUI_TEXTCOLOR "f0f0f0"

; Remove the default white header banner on inner pages
!define MUI_HEADER_TRANSPARENT

; Header image for inner pages
!define MUI_HEADER_IMAGE
!define MUI_HEADER_IMAGE_BITMAP "${__FILEDIR__}\header.bmp"
!define MUI_HEADER_IMAGE_RIGHT
