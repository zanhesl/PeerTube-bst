import { HttpStatusCode, ResultList, VideoPlaylistElement } from '../../../../../shared/models'
import { logger } from '../../../root-helpers'
import { AuthHTTP } from './auth-http'

export class PlaylistFetcher {

  constructor (private readonly http: AuthHTTP) {

  }

  async loadPlaylist (playlistId: string, host : string) {
    const playlistPromise = this.loadPlaylistInfo(playlistId, host)
    const playlistElementsPromise = this.loadPlaylistElements(playlistId, host)

    let playlistResponse: Response
    let isResponseOk: boolean

    try {
      playlistResponse = await playlistPromise
      isResponseOk = playlistResponse.status === HttpStatusCode.OK_200
    } catch (err) {
      logger.error(err)
      isResponseOk = false
    }

    if (!isResponseOk) {
      if (playlistResponse?.status === HttpStatusCode.NOT_FOUND_404) {
        throw new Error('This playlist does not exist.')
      }

      throw new Error('We cannot fetch the playlist. Please try again later.')
    }

    return { playlistResponse, videosResponse: await playlistElementsPromise }
  }

  async loadAllPlaylistVideos (playlistId: string, baseResult: ResultList<VideoPlaylistElement>, host : string) {
    let elements = baseResult.data
    let total = baseResult.total
    let i = 0

    while (total > elements.length && i < 10) {
      const result = await this.loadPlaylistElements(playlistId, host, elements.length)

      const json = await result.json()
      total = json.total

      elements = elements.concat(json.data)
      i++
    }

    if (i === 10) {
      logger.error('Cannot fetch all playlists elements, there are too many!')
    }

    return elements
  }

  private loadPlaylistInfo (playlistId: string, host : string): Promise<Response> {
    return this.http.fetch(this.getPlaylistUrl(playlistId, host), { optionalAuth: true })
  }

  private loadPlaylistElements (playlistId: string, host : string, start = 0): Promise<Response> {
    const url = new URL(this.getPlaylistUrl(playlistId, host) + '/videos')
    url.search = new URLSearchParams({ start: '' + start, count: '100' }).toString()

    return this.http.fetch(url.toString(), { optionalAuth: true })
  }

  private getPlaylistUrl (id: string, host : string) {
    return host + '/api/v1/video-playlists/' + id
  }
}
