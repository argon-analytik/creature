#include <X11/Xlib.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>

static Window supplied_window(int argc, char **argv) {
  for (int index = 1; index + 1 < argc; index += 1) {
    if (strcmp(argv[index], "-window") == 0 || strcmp(argv[index], "-window-id") == 0) {
      return (Window)strtoul(argv[index + 1], NULL, 0);
    }
  }
  return 0;
}

int main(int argc, char **argv) {
  Display *display = XOpenDisplay(NULL);
  if (display == NULL) return 1;
  Window window = supplied_window(argc, argv);
  if (window == 0) {
    window = XCreateSimpleWindow(display, DefaultRootWindow(display), 0, 0, 1280, 720, 0, 0, 0);
    XMapRaised(display, window);
  }
  XSelectInput(display, window, ExposureMask | StructureNotifyMask);
  for (;;) {
    XEvent event;
    XNextEvent(display, &event);
    if (event.type == DestroyNotify) break;
    if (event.type == Expose || event.type == ConfigureNotify) {
      XWindowAttributes attributes;
      XGetWindowAttributes(display, window, &attributes);
      XSetForeground(display, DefaultGC(display, DefaultScreen(display)), BlackPixel(display, DefaultScreen(display)));
      XFillRectangle(display, window, DefaultGC(display, DefaultScreen(display)), 0, 0, (unsigned)attributes.width, (unsigned)attributes.height);
      XFlush(display);
    }
    usleep(16 * 1000);
  }
  XCloseDisplay(display);
  return 0;
}
