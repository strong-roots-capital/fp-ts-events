import { RegisterEvent, EventEmitter } from '.'
import { sequence } from 'fp-ts/lib/Array'
import { Monad1 } from 'fp-ts/lib/Monad'
import { Kind, URIS } from 'fp-ts/HKT'
import { createEventEmitter } from '.'
import { io } from 'fp-ts/lib/IO'

// SECTION Event declarations

// Algebra represents room created event
type RoomCreated<F extends URIS> = { roomCreated(name: string): Kind<F, undefined> }

// Algebra represents room removed event
type RoomRemoved<F extends URIS> = { roomRemoved(name: string): Kind<F, undefined> }

// Algebra represents rooms cleared event
type RoomsCleared<F extends URIS> = { roomsCleared(): Kind<F, undefined> }

// Algebra represents all room events
type RoomEvents<F extends URIS> =
  & RoomCreated<F>
  & RoomRemoved<F>
  & RoomsCleared<F>

// Algebra represents all events
type Events<F extends URIS> =
  & RoomEvents<F>

// SECTION Algebra declarations

// MODULE Logger algebra

// Algebra represents logging effects
type Logger<F extends URIS> = { log(message: string): Kind<F, undefined> }

// Test algebra returning list of logged messages
type GetLogs<F extends URIS> = { getLogs(): Kind<F, Array<string>> }

// Algebra represents logging with test methods
type TestLogger<F extends URIS> = Logger<F> & GetLogs<F>

// MODULE RoomRepository algebra

/** Algebra represents room adding effect */
type AddRoom<F extends URIS> = { addRoom(name: string): Kind<F, undefined> }

/** Algebra represents room removal effect */
type RemoveRoom<F extends URIS> = { removeRoom(name: string): Kind<F, undefined> }

/** Algebra represents all rooms clear effect */
type ClearRooms<F extends URIS> = { clearRooms(): Kind<F, undefined> }

/** Algebra represents room listing query */
type ListRooms<F extends URIS> = { listRooms(): Kind<F, Set<string>> }

// Algebra represents room repository effects and queries
type RoomRepository<F extends URIS> =
  & AddRoom<F>
  & RemoveRoom<F>
  & ClearRooms<F>
  & ListRooms<F>

// MODULE Emitter algebra

// Event emitter will be used in testing
type Emitter<F extends URIS> = EventEmitter<F, Events<F>>

// SECTION Program algebra building

// Program will be used for testing
type TestProgram<F extends URIS> =
  & Monad1<F>
  & TestLogger<F>
  & RoomRepository<F>
  & Emitter<F>

// SECTION Interpreters

// Creates event emitter for room events and layers
function createEmitter<F extends URIS>(M: Monad1<F>): Emitter<F> {
  return createEventEmitter<F, Events<F>>(M)
}

// Creates test logger that stores all logs in array
function getTestLogger<F extends URIS>(M: Monad1<F>): TestLogger<F> {
  const state: Array<string> = []

  return {
    log: (message) => { state.push(message); return M.of(undefined) },
    getLogs: () => M.of(state)
  }
}

// Returns room repository that can add, remove and clear rooms
function getRoomRepository<F extends URIS>(M: Monad1<F>): RoomRepository<F> {
  const state = new Set<string>()

  return {
    addRoom: (name) => {
      if (!state.has(name)) {
        state.add(name)
      }

      return M.of(undefined)
    },
    removeRoom: (name) => {
      if (state.has(name)) {
        state.delete(name)
      }

      return M.of(undefined)
    },
    clearRooms: () => {
      state.clear()

      return M.of(undefined)
    },
    listRooms: () => {
      return M.of(state)
    }
  }
}

// Returns test program instance
function createTestProgram<F extends URIS>(M: Monad1<F>): TestProgram<F> {
  return {
    ...M,
    ...createEmitter(M),
    ...getTestLogger(M),
    ...getRoomRepository(M)
  }
}

// SECTION Event listeners registration

/** On room created, add it to room storage */
function enableRoomCreatedMutation<F extends URIS>(P: AddRoom<F> & RegisterEvent<F, RoomCreated<F>>) {
  return P.on('roomCreated', P.addRoom)
}

/** On room created, log a message about it */
function enableRoomCreatedLogging<F extends URIS>(P: Logger<F> & RegisterEvent<F, RoomCreated<F>>) {
  return P.on('roomCreated', name => P.log(`Room '${name}' created`))
}

/** On room removed, remove it from room storage */
function enableRoomRemovedMutation<F extends URIS>(P: RemoveRoom<F> & RegisterEvent<F, RoomRemoved<F>>) {
  return P.on('roomRemoved', P.removeRoom)
}

/** On room removed, log a message about it */
function enableRoomRemovedLogging<F extends URIS>(P: Logger<F> & RegisterEvent<F, RoomRemoved<F>>) {
  return P.on('roomRemoved', name => P.log(`Room '${name}' removed`))
}

/** On rooms cleared, clear it in room storage */
function enableRoomsClearedMutation<F extends URIS>(P: ClearRooms<F> & RegisterEvent<F, RoomsCleared<F>>) {
  return P.on('roomsCleared', P.clearRooms)
}

/** On rooms cleared, log a message about it */
function enableRoomsClearedLogging<F extends URIS>(P: Logger<F> & RegisterEvent<F, RoomsCleared<F>>) {
  return P.on('roomsCleared', () => P.log('All rooms cleared'))
}

/** Enables listeners for 'roomCreated' event */
function enableRoomCreatedEvents<F extends URIS>(P: AddRoom<F> & Logger<F> & RegisterEvent<F, RoomCreated<F>>) {
  return sequence(io)([enableRoomCreatedMutation(P), enableRoomCreatedLogging(P)])
}

/** Enables listeners for 'roomRemoved' event */
function enableRoomRemovedEvents<F extends URIS>(P: RemoveRoom<F> & Logger<F> & RegisterEvent<F, RoomRemoved<F>>) {
  return sequence(io)([enableRoomRemovedMutation(P), enableRoomRemovedLogging(P)])
}

/** Enables listeners for 'roomsCleared' event */
function enableRoomsClearedEvents<F extends URIS>(P: ClearRooms<F> & Logger<F> & RegisterEvent<F, RoomsCleared<F>>) {
  return sequence(io)([enableRoomsClearedMutation(P), enableRoomsClearedLogging(P)])
}

/** Enables listeners for all events */
function registerEvents<F extends URIS>(P: RoomRepository<F> & Logger<F> & RegisterEvent<F, RoomEvents<F>>) {
  return sequence(io)([enableRoomCreatedEvents(P), enableRoomRemovedEvents(P), enableRoomsClearedEvents(P)])
}

// SECTION Test program

describe('event emitter', () => {
  it('should run all registered listeners', () => {
    const P = createTestProgram(io)

    registerEvents(P)()

    P.emit('roomCreated', 'room1')()
    P.emit('roomCreated', 'room2')()

    expect(P.listRooms()()).toMatchObject(new Set(['room1', 'room2']))

    P.emit('roomRemoved', 'room2')()

    expect(P.listRooms()()).toMatchObject(new Set(['room1']))

    P.emit('roomsCleared')()

    expect(P.listRooms()()).toMatchObject(new Set())

    expect(P.getLogs()()).toMatchObject([
      'Room \'room1\' created',
      'Room \'room2\' created',
      'Room \'room2\' removed',
      'All rooms cleared',
    ])
  })
})
