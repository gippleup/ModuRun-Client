import React, { useState, useContext, useEffect } from 'react';
import {
  StyleSheet, View, Text, TouchableOpacity, Image, TextInput, Keyboard, Alert,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { connect } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialIcons';
import TrackManager from './modules/TrackManager';
import MyPage from './modules/MyPage';
import TrackMaster from './modules/TrackMaster/TrackMaster';
import FilterModal, { InputUsernameModal } from './modules/Modal';
import getEnvVars from '../environment';
import ScheduleManager from './modules/ScheduleManager';
import { getUserLocation, getFilterCondition } from './modules/utils';
import { getSchedules } from './modules/API/schedule';
import dummySchedules from './modules/TrackMaster/dummyData/dummySchedules.json';
import reduxStore from '../redux/store';
// import schedules from './modules/API/SG/schedules';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 5,
    backgroundColor: '#1E90FF',
  },
  header: {
    // flex: 1,
    flexDirection: 'row',
    backgroundColor: 'white',
    alignItems: 'center',
    padding: 5,
  },
  main: {
    flex: 10,
    // backgroundColor: 'yellow',
    // alignItems: 'center',
    // justifyContent: 'center',
    padding: 5,
  },
  search: {
    backgroundColor: 'white',
    marginLeft: 10,
    width: 320,
    padding: 5,
  },
  filterButton: {
    position: 'absolute',
    right: 60,
    top: 19,
  },
  suggestion: {
    flex: 1,
    backgroundColor: 'white',
    borderWidth: 0.5,
    padding: 5,
  },
});

export const Main = () => {
  const navigation = useNavigation();
  const [typing, setTyping] = useState(false);
  const [destination, setDestination] = useState('');
  const [predictions, setPredictions] = useState([]);
  const [searching, setSearching] = useState(false);
  const [schedules, setSchedules] = useState([]);
  const [location, setLocation] = useState({
    longitude: 0,
    latitude: 0,
  });

  useEffect(() => {
    async function initializeLocation() {
      try {
        const { latitude, longitude } = await getUserLocation();
        setLocation({
          ...location,
          latitude,
          longitude,
        });
      } catch (e) {
        console.log(e);
      }
    }
    initializeLocation();
  }, []);

  const filter = getFilterCondition();
  const [filterCondition, setFilterCondition] = useState(filter);
  const { apiKey } = getEnvVars('dev');

  useEffect(() => {
    Keyboard.addListener('keyboardDidShow', () => setTyping(false));
    Keyboard.addListener('keyboardDidShow', () => setTyping(true));
    return () => {
      Keyboard.removeListener('keyboardDidShow', () => setTyping(false));
      Keyboard.removeListener('keyboardDidShow', () => setTyping(true));
    };
  }, [typing]);

  useEffect(() => {
    const getSchedulesAPI = async () => {
      const scheduleData = await getSchedules(filterCondition, location);
      if (!scheduleData && scheduleData === false) {
        setSchedules([]);
      } else {
        setSchedules(scheduleData);
      }
    };
    getSchedulesAPI();
  }, [location, filterCondition]);

  const searched = () => {
    Keyboard.dismiss();
    setSearching(false);
    setDestination('');
  };

  const onSearch = () => {
    setSearching(true);
  };

  const pickedSearchedLocation = ({ lat, lng }) => {
    Keyboard.dismiss();
    setLocation({
      ...location,
      latitude: lat,
      longitude: lng,
    });
  };

  const toggleSideBar = () => {
    navigation.openDrawer();
  };

  const onChangeDestination = async (text) => {
    setDestination(text);
    const apiUrl = `https://maps.googleapis.com/maps/api/place/autocomplete/json?key=${apiKey}&language=ko&input=${text}`;
    try {
      const result = await fetch(apiUrl);
      const json = await result.json();
      setPredictions(json.predictions);
    } catch (e) {
      console.error(e);
    }
  };

  const predictionsList = predictions.map((prediction) => (
    <TouchableOpacity
      key={prediction.id}
      style={styles.suggestion}
      onPress={async () => {
        const apiUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${prediction.place_id}&key=${apiKey}`;
        const result = await fetch(apiUrl);
        const json = await result.json();
        pickedSearchedLocation(json.result.geometry.location);
        searched();
      }}
    >
      <Text>{prediction.description}</Text>
    </TouchableOpacity>
  ));

  const renderRecommendation = () => {
    if (searching) {
      return (
        <View style={styles.main}>
          {predictionsList}
        </View>
      );
    }
    return (<></>);
  };

  const renderMainView = () => {
    if (!searching) {
      return (
        <TrackMaster mode="scheduleViewer" schedules={schedules} initialCamera={location} moveOnMarkerPress />
      );
    }
    return (<></>);
  };

  const addSchedule = () => {
    navigation.navigate('Scheduler');
  };

  const usernameInput = () => {
    const { isFirstLogin } = reduxStore.getState().userInfo.user;
    if (!isFirstLogin) {
      return (
        <></>
      );
    }
    return (
      <InputUsernameModal />
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        {usernameInput()}
        <TouchableOpacity onPress={() => {
          toggleSideBar({ navigation });
        }}
        >
          <Image
            source={{ uri: 'https://reactnativecode.com/wp-content/uploads/2018/04/hamburger_icon.png' }}
            style={{ width: 25, height: 25, marginLeft: 15 }}
          />
        </TouchableOpacity>
        <TextInput
          style={styles.search}
          placeholder="검색"
          value={destination}
          onTouchStart={onSearch}
          onChangeText={onChangeDestination}
          onSubmitEditing={searched}
        />
      </View>
      <View style={styles.main}>
        {renderRecommendation()}
        {renderMainView()}
        <View style={styles.filterButton}>
          <FilterModal style={styles.main} value={filterCondition} setAction={setFilterCondition} />
        </View>
        <View style={{ alignSelf: 'center', alignItems: 'center' }}>
          <Icon.Button name="add-circle" color="black" size={30} backgroundColor="rgba(52, 52, 52, 0.0)" onPress={addSchedule} />
        </View>
      </View>
    </View>
  );
};

const Drawer = createDrawerNavigator();

function SideBar() {
  return (
    <Drawer.Navigator initialRouteName="Main">
      <Drawer.Screen name="메인" component={Main} />
      <Drawer.Screen name="트랙 관리" component={TrackManager} />
      <Drawer.Screen name="스케줄 관리" component={ScheduleManager} />
      <Drawer.Screen name="마이페이지" component={MyPage} />
    </Drawer.Navigator>
  );
}

export default SideBar;
