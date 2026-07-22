cmake_minimum_required(VERSION 3.24)
project(CreatureSaver LANGUAGES CXX)

add_executable(CreatureSaver WIN32 CreatureSaver.cpp)
target_compile_features(CreatureSaver PRIVATE cxx_std_20)
target_link_libraries(CreatureSaver PRIVATE scrnsave user32 gdi32)
set_target_properties(CreatureSaver PROPERTIES SUFFIX ".scr")
