#include <windows.h>
#include <scrnsave.h>

namespace {
UINT_PTR timer = 0;

void paint_black(HWND window) {
  PAINTSTRUCT paint{};
  HDC context = BeginPaint(window, &paint);
  RECT bounds{};
  GetClientRect(window, &bounds);
  FillRect(context, &bounds, static_cast<HBRUSH>(GetStockObject(BLACK_BRUSH)));
  EndPaint(window, &paint);
}
}

extern "C" LRESULT WINAPI ScreenSaverProc(HWND window, UINT message, WPARAM word, LPARAM long_word) {
  switch (message) {
    case WM_CREATE:
      timer = SetTimer(window, 1, 16, nullptr);
      return 0;
    case WM_TIMER:
      InvalidateRect(window, nullptr, FALSE);
      return 0;
    case WM_PAINT:
      paint_black(window);
      return 0;
    case WM_DESTROY:
      if (timer != 0) KillTimer(window, timer);
      timer = 0;
      return 0;
    default:
      return DefScreenSaverProc(window, message, word, long_word);
  }
}

extern "C" BOOL WINAPI RegisterDialogClasses(HANDLE) {
  return TRUE;
}
