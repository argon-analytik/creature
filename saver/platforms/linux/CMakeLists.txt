cmake_minimum_required(VERSION 3.24)
project(creature_saver_ambient C)

find_package(X11 REQUIRED)
add_executable(creature-saver-ambient creature-saver-ambient.c)
target_link_libraries(creature-saver-ambient PRIVATE X11::X11)
