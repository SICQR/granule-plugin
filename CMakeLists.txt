cmake_minimum_required(VERSION 3.22)
project(GRANULE VERSION 1.0.0)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

include(FetchContent)
FetchContent_Declare(
  JUCE
  GIT_REPOSITORY https://github.com/juce-framework/JUCE.git
  GIT_TAG        7.0.9
)
FetchContent_MakeAvailable(JUCE)

juce_add_plugin(GRANULE
    FORMATS VST3 Standalone
    PRODUCT_NAME               "GRANULE"
    BUNDLE_ID                  "com.hnhmess.granule"
    COMPANY_NAME               "HNH MESS"
    PLUGIN_MANUFACTURER_CODE   HnhM
    PLUGIN_CODE                Gran
    IS_SYNTH                   FALSE
    NEEDS_MIDI_INPUT           TRUE
    NEEDS_MIDI_OUTPUT          FALSE
    IS_MIDI_EFFECT             FALSE
    EDITOR_WANTS_KEYBOARD_FOCUS FALSE
    VST3_CATEGORIES            "Fx|Reverb"
)

target_sources(GRANULE PRIVATE
    Source/PluginProcessor.cpp
    Source/PluginEditor.cpp
    Source/DSP/GrainEngine.cpp
    Source/DSP/AllpassFilter.cpp
    Source/DSP/DiffusionNetwork.cpp
    Source/DSP/CombFilter.cpp
    Source/DSP/EarlyReflections.cpp
    Source/DSP/LFO.cpp
)

juce_generate_juce_header(GRANULE)

target_compile_features(GRANULE PRIVATE cxx_std_17)

target_include_directories(GRANULE PRIVATE Source)

target_compile_definitions(GRANULE PUBLIC
    JUCE_WEB_BROWSER=0
    JUCE_USE_CURL=0
    JUCE_VST3_CAN_REPLACE_VST2=0
)

target_link_libraries(GRANULE PRIVATE
    juce::juce_audio_utils
    juce::juce_dsp
    juce::juce_graphics
    juce::juce_gui_basics
    juce::juce_recommended_config_flags
)
